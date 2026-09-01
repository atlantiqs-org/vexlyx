import type { FastifyInstance, FastifyReply } from "fastify";
import { DockerfileService, DockerfileError } from "./service.js";
import { SaveDockerfileSchema } from "./schema.js";

// ---------------------------------------------------------------------------
// Error handler helper
// ---------------------------------------------------------------------------

function handleDockerfileError(err: unknown, reply: FastifyReply): void {
  if (err instanceof DockerfileError) {
    reply.status(err.statusCode).send({
      error: err.message,
      code: err.code,
      details: {},
    });
    return;
  }
  throw err;
}

export async function dockerfileRoutes(app: FastifyInstance) {
  const service = new DockerfileService(app.prisma);

  // ---------------------------------------------------------------------------
  // GET /api/projects/:id/dockerfile — read Dockerfile/.dockerignore status
  // ---------------------------------------------------------------------------
  app.get(
    "/:id/dockerfile",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return await service.getDockerfile(request.userId!, id);
      } catch (err) {
        handleDockerfileError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // PUT /api/projects/:id/dockerfile — save/update Dockerfile/.dockerignore
  // ---------------------------------------------------------------------------
  app.put(
    "/:id/dockerfile",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = SaveDockerfileSchema.parse(request.body);
        const result = await service.saveDockerfile(request.userId!, id, data);
        return {
          message: "Dockerfile configuration saved successfully",
          status: result,
        };
      } catch (err) {
        handleDockerfileError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /api/projects/:id/dockerfile/templates — get starter templates
  // ---------------------------------------------------------------------------
  app.get(
    "/:id/dockerfile/templates",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        return { templates: service.getTemplates() };
      } catch (err) {
        handleDockerfileError(err, reply);
      }
    },
  );
}
