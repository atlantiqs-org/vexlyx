import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { EnvService } from "../env/service.js";
import type { WordPressInstallInput, WordPressUploadInput } from "./schema.js";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class WordPressError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "WordPressError";
  }
}

// ---------------------------------------------------------------------------
// Locate build_manager.py
// ---------------------------------------------------------------------------

function getBuildManagerScriptPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDir, "../../../../../system/python/build_manager.py"),
    resolve(currentDir, "../../../../system/python/build_manager.py"),
    resolve(process.cwd(), "../../system/python/build_manager.py"),
    resolve(process.cwd(), "system/python/build_manager.py"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return candidates[0] ?? resolve(process.cwd(), "system/python/build_manager.py");
}

function runPythonCommand<T>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolveP, rejectP) => {
    const scriptPath = getBuildManagerScriptPath();
    const child = spawn("python", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      const raw = stdout.trim();
      if (!raw) {
        rejectP(
          new WordPressError(
            `build_manager.py produced no output (stderr: ${stderr.trim()})`,
            "WP_SYSTEM_NO_OUTPUT",
            500,
          ),
        );
        return;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw);
      } catch {
        rejectP(
          new WordPressError(
            `build_manager.py returned invalid JSON: ${raw}`,
            "WP_SYSTEM_INVALID_JSON",
            500,
          ),
        );
        return;
      }

      if (parsed.error || code !== 0) {
        rejectP(
          new WordPressError(
            (parsed.error as string) || "System script failed",
            (parsed.code as string) || "WP_SYSTEM_ERROR",
            422,
          ),
        );
        return;
      }

      resolveP(parsed as T);
    });

    child.on("error", (err) => {
      rejectP(
        new WordPressError(
          `Failed to spawn system build manager: ${err.message}`,
          "WP_SPAWN_ERROR",
          500,
        ),
      );
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class WordPressService {
  private envService: EnvService;

  constructor(private prisma: PrismaClient) {
    this.envService = new EnvService(prisma);
  }

  async install(
    userId: string,
    projectId: string,
    input: WordPressInstallInput,
  ) {
    const project = await this.findOwnedProject(userId, projectId);
    const projectDir = resolve(env.PROJECTS_DIR, projectId);

    const result = await runPythonCommand<{
      success: boolean;
      projectDir: string;
      hasWpConfig: boolean;
      hasHtaccess: boolean;
    }>({
      command: "wordpress-install",
      projectDir,
      dbName: input.dbName,
      dbUser: input.dbUser,
      dbPassword: input.dbPassword,
      dbHost: input.dbHost,
      dbPrefix: input.dbPrefix,
      downloadCore: input.downloadCore,
    });

    // Update project type to WORDPRESS if it's not already
    if (project.type !== "WORDPRESS") {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { type: "WORDPRESS" },
      });
    }

    // Upsert database env vars
    const envVars = [
      { key: "DB_NAME", value: input.dbName },
      { key: "DB_USER", value: input.dbUser },
      { key: "DB_PASSWORD", value: input.dbPassword },
      { key: "DB_HOST", value: input.dbHost },
      { key: "DB_PREFIX", value: input.dbPrefix },
    ];
    await this.envService.bulkUpsert(userId, projectId, envVars);

    return {
      message: "WordPress core and configuration installed successfully",
      ...result,
    };
  }

  async uploadAsset(
    userId: string,
    projectId: string,
    input: WordPressUploadInput,
  ) {
    await this.findOwnedProject(userId, projectId);
    const projectDir = resolve(env.PROJECTS_DIR, projectId);

    const result = await runPythonCommand<{
      success: boolean;
      assetType: string;
      extractedFiles: number;
      targetDir: string;
    }>({
      command: "wordpress-upload",
      projectDir,
      assetType: input.assetType,
      zipBase64: input.zipBase64,
    });

    return {
      message: `WordPress ${input.assetType} uploaded and extracted successfully`,
      ...result,
    };
  }

  async getStatus(userId: string, projectId: string) {
    await this.findOwnedProject(userId, projectId);
    const projectDir = resolve(env.PROJECTS_DIR, projectId);

    return runPythonCommand<{
      installed: boolean;
      coreVersion: string;
      plugins: string[];
      themes: string[];
    }>({
      command: "wordpress-status",
      projectDir,
    });
  }

  private async findOwnedProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        type: true,
        deletedAt: true,
      },
    });

    if (!project || project.deletedAt !== null) {
      throw new WordPressError("Project not found", "PROJECT_NOT_FOUND", 404);
    }

    if (project.userId !== userId) {
      throw new WordPressError(
        "You do not have access to this project",
        "FORBIDDEN",
        403,
      );
    }

    return project;
  }
}
