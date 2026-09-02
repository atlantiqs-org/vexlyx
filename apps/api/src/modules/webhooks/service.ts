import { createHmac, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import type {
  GitHubPushPayload,
  GitHubWebhookResponse,
} from "@vexlyx/shared";
import { env } from "../../config/env.js";
import type { BuildJobData } from "../build/schema.js";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class WebhookError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "WebhookError";
  }
}

// ---------------------------------------------------------------------------
// Service Layer
// ---------------------------------------------------------------------------

export class WebhookService {
  constructor(
    private prisma: PrismaClient,
    private logger?: FastifyBaseLogger,
  ) {}

  /**
   * Cryptographically verifies GitHub HMAC-SHA256 signature using constant-time comparison.
   * Prevents timing attack vulnerabilities.
   */
  verifySignature(
    secret: string,
    rawBody: string,
    signatureHeader?: string | string[],
  ): boolean {
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    if (!signature || !signature.startsWith("sha256=")) {
      return false;
    }

    try {
      const computedHash = createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("hex");
      const expectedSignature = `sha256=${computedHash}`;

      const sigBuffer = Buffer.from(signature, "utf8");
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Processes an incoming GitHub webhook event.
   */
  async handleGitHubWebhook(
    projectId: string,
    event: string,
    rawBody: string,
    signatureHeader: string | string[] | undefined,
    payload: unknown,
    enqueueJob: (data: BuildJobData) => Promise<void>,
  ): Promise<GitHubWebhookResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        userId: true,
        gitUrl: true,
        branch: true,
        buildCmd: true,
        webhookSecret: true,
        deletedAt: true,
      },
    });

    if (!project || project.deletedAt !== null) {
      throw new WebhookError("Project not found", "PROJECT_NOT_FOUND", 404);
    }

    if (!project.webhookSecret) {
      throw new WebhookError(
        "Webhook secret not configured for this project",
        "WEBHOOK_SECRET_NOT_CONFIGURED",
        400,
      );
    }

    // Verify cryptographic signature
    const isValid = this.verifySignature(
      project.webhookSecret,
      rawBody,
      signatureHeader,
    );

    if (!isValid) {
      throw new WebhookError(
        "Invalid GitHub webhook signature (x-hub-signature-256)",
        "INVALID_WEBHOOK_SIGNATURE",
        401,
      );
    }

    // Handle Ping event
    if (event === "ping") {
      this.logger?.info(
        { projectId, event },
        "GitHub webhook ping verified successfully",
      );
      return {
        success: true,
        message: "Pong! GitHub webhook signature verified successfully.",
      };
    }

    // Handle Push event
    if (event === "push") {
      const pushPayload = payload as GitHubPushPayload;
      const ref = pushPayload.ref || "";
      const pushedBranch = ref.replace(/^refs\/heads\//, "");

      if (pushedBranch !== project.branch) {
        this.logger?.info(
          { projectId, pushedBranch, configuredBranch: project.branch },
          "Ignoring push event for non-configured branch",
        );
        return {
          success: true,
          ignored: true,
          reason: `Branch mismatch: push to '${pushedBranch}', but project is configured for '${project.branch}'`,
          message: `Ignored push to branch '${pushedBranch}'`,
        };
      }

      const headCommit = pushPayload.head_commit;
      const commitHash = headCommit?.id ?? pushPayload.after ?? null;
      const commitMsg = headCommit?.message ?? null;

      // Create new deployment record in QUEUED status
      const deployment = await this.prisma.deployment.create({
        data: {
          projectId: project.id,
          status: "QUEUED",
          commitHash,
          commitMsg,
        },
      });

      const projectDir = resolve(env.PROJECTS_DIR, project.id);
      const imageName = `${env.NIXPACKS_IMAGE_PREFIX}-${project.id}`;
      const effectiveBuildCmd = project.buildCmd ?? null;

      await enqueueJob({
        deploymentId: deployment.id,
        projectId: project.id,
        userId: project.userId,
        projectDir,
        imageName,
        buildCmd: effectiveBuildCmd,
      });

      this.logger?.info(
        {
          projectId: project.id,
          deploymentId: deployment.id,
          commitHash,
          branch: project.branch,
        },
        "Auto-deploy triggered and queued via GitHub webhook push",
      );

      return {
        success: true,
        deploymentId: deployment.id,
        message: `Auto-deploy queued for commit ${
          commitHash ? commitHash.slice(0, 7) : "HEAD"
        } on branch '${project.branch}'`,
      };
    }

    // Gracefully ignore other events (pull_request, issue, etc.)
    return {
      success: true,
      ignored: true,
      reason: `Event '${event}' is not handled; auto-deploy is configured for 'push' events.`,
      message: `Event '${event}' ignored`,
    };
  }
}
