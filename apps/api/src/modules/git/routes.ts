import type { FastifyInstance, FastifyReply } from "fastify";
import { GitService, GitError } from "./service.js";
import { ConnectRepoSchema } from "./schema.js";

// ---------------------------------------------------------------------------
// Shared error handler — mirrors the pattern in projects/routes.ts
// ---------------------------------------------------------------------------

function handleGitError(err: unknown, reply: FastifyReply): void {
  if (err instanceof GitError) {
    reply.status(err.statusCode).send({
      error: err.message,
      code: err.code,
      details: {},
    });
    return;
  }
  throw err;
}

// ---------------------------------------------------------------------------
// Routes — mounted at /api/projects (prefix shared with project routes)
// All paths are /:id/git/...
// ---------------------------------------------------------------------------

export async function gitRoutes(app: FastifyInstance) {
  const service = new GitService(app.prisma);

  // -------------------------------------------------------------------------
  // GET /api/projects/:id/git
  // Returns git metadata: current URL, branch, SSH public key, webhook URL.
  // -------------------------------------------------------------------------
  app.get(
    "/:id/git",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return await service.getMetadata(request.userId!, id);
      } catch (err) {
        handleGitError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/projects/:id/git/connect
  // Clone (or re-pull) the connected repository into the project workspace.
  // Body: { gitUrl, branch, isPrivate? }
  // -------------------------------------------------------------------------
  app.post(
    "/:id/git/connect",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = ConnectRepoSchema.parse(request.body);
        const metadata = await service.connectRepo(request.userId!, id, data);
        return metadata;
      } catch (err) {
        handleGitError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/projects/:id/git/ssh-key
  // Generate a new Ed25519 key pair for this project.
  // Returns { publicKey } — user copies this into GitHub/GitLab Deploy Keys.
  // Overwrites any previously generated key for this project.
  // -------------------------------------------------------------------------
  app.post(
    "/:id/git/ssh-key",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await service.generateSshKey(request.userId!, id);
        reply.status(201);
        return result;
      } catch (err) {
        handleGitError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/projects/:id/git/webhook-secret/rotate
  // Rotate / regenerate the HMAC-SHA256 webhook secret for this project.
  // -------------------------------------------------------------------------
  app.post(
    "/:id/git/webhook-secret/rotate",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await service.rotateWebhookSecret(request.userId!, id);
        reply.status(200);
        return result;
      } catch (err) {
        handleGitError(err, reply);
      }
    },
  );
}
