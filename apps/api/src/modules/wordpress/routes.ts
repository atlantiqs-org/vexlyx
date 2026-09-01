import type { FastifyInstance, FastifyReply } from "fastify";
import { WordPressService, WordPressError } from "./service.js";
import {
  ProjectIdParamSchema,
  WordPressInstallSchema,
  WordPressUploadSchema,
} from "./schema.js";

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

function handleWordPressError(err: unknown, reply: FastifyReply): void {
  if (err instanceof WordPressError) {
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
// Routes -- mounted under /api/projects
// ---------------------------------------------------------------------------

export async function wordpressRoutes(app: FastifyInstance) {
  const service = new WordPressService(app.prisma);

  // -------------------------------------------------------------------------
  // POST /api/projects/:id/wordpress/install
  // 1-Click WordPress installation and configuration
  // -------------------------------------------------------------------------
  app.post(
    "/:id/wordpress/install",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = ProjectIdParamSchema.parse(request.params);
        const body = WordPressInstallSchema.parse(request.body ?? {});
        const result = await service.install(request.userId!, id, body);
        reply.status(200);
        return result;
      } catch (err) {
        handleWordPressError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/projects/:id/wordpress/upload
  // Upload and unpack plugin or theme zip
  // -------------------------------------------------------------------------
  app.post(
    "/:id/wordpress/upload",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = ProjectIdParamSchema.parse(request.params);
        const body = WordPressUploadSchema.parse(request.body);
        const result = await service.uploadAsset(request.userId!, id, body);
        reply.status(200);
        return result;
      } catch (err) {
        handleWordPressError(err, reply);
      }
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/projects/:id/wordpress/status
  // Get WordPress installation status, core version, plugins, themes
  // -------------------------------------------------------------------------
  app.get(
    "/:id/wordpress/status",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = ProjectIdParamSchema.parse(request.params);
        const result = await service.getStatus(request.userId!, id);
        return result;
      } catch (err) {
        handleWordPressError(err, reply);
      }
    },
  );
}
