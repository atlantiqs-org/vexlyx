import type { FastifyInstance, FastifyReply } from "fastify";
import { SetEnvVarSchema, BulkSetEnvVarsSchema, ImportEnvFileSchema } from "@vexlyx/shared";
import { EnvService, EnvError } from "./service.js";
import { ProjectIdParamSchema, EnvKeyParamSchema } from "./schema.js";

// ---------------------------------------------------------------------------
// Shared error handler
// ---------------------------------------------------------------------------

function handleEnvError(err: unknown, reply: FastifyReply): void {
  if (err instanceof EnvError) {
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
// Routes -- mounted with prefix /api/projects
// ---------------------------------------------------------------------------

export async function envRoutes(app: FastifyInstance) {
  const service = new EnvService(app.prisma);

  // -------------------------------------------------------------------------
  // GET /api/projects/:id/env
  // Lists all environment variables for a project (values masked)
  // -------------------------------------------------------------------------
  app.get(
    "/:id/env",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = ProjectIdParamSchema.parse(request.params);
        const result = await service.list(request.userId!, id);
        return result;
      } catch (err) {
        handleEnvError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/projects/:id/env/:key/reveal
  // Reveals a single environment variable's decrypted value
  // -------------------------------------------------------------------------
  app.get(
    "/:id/env/:key/reveal",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id, key } = EnvKeyParamSchema.parse(request.params);
        const result = await service.reveal(request.userId!, id, key);
        return result;
      } catch (err) {
        handleEnvError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/projects/:id/env
  // Upserts environment variables (supports single or bulk batch)
  // -------------------------------------------------------------------------
  app.post(
    "/:id/env",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = ProjectIdParamSchema.parse(request.params);

        // Check if bulk or single
        const body = request.body as Record<string, unknown>;
        if (body && Array.isArray(body.variables)) {
          const bulkInput = BulkSetEnvVarsSchema.parse(body);
          const result = await service.bulkUpsert(
            request.userId!,
            id,
            bulkInput.variables,
          );
          reply.status(200);
          return result;
        }

        const singleInput = SetEnvVarSchema.parse(body);
        const result = await service.upsert(
          request.userId!,
          id,
          singleInput.key,
          singleInput.value,
        );
        reply.status(200);
        return result;
      } catch (err) {
        handleEnvError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/projects/:id/env/import
  // Imports raw .env file text
  // -------------------------------------------------------------------------
  app.post(
    "/:id/env/import",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = ProjectIdParamSchema.parse(request.params);
        const body = ImportEnvFileSchema.parse(request.body);
        const result = await service.importDotEnv(
          request.userId!,
          id,
          body.content,
          body.overwrite,
        );
        reply.status(200);
        return result;
      } catch (err) {
        handleEnvError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /api/projects/:id/env/:key
  // Deletes an environment variable
  // -------------------------------------------------------------------------
  app.delete(
    "/:id/env/:key",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id, key } = EnvKeyParamSchema.parse(request.params);
        const result = await service.delete(request.userId!, id, key);
        reply.status(200);
        return result;
      } catch (err) {
        handleEnvError(err, reply);
      }
    },
  );
}
