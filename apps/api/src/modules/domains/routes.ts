import type { FastifyInstance, FastifyReply } from "fastify";
import { DomainService, DomainError } from "./service.js";
import {
  CreateDomainSchema,
  DomainListQuerySchema,
  DomainIdParamSchema,
  VerifyDomainQuerySchema,
} from "./schema.js";

function handleDomainError(err: unknown, reply: FastifyReply): void {
  if (err instanceof DomainError) {
    reply.status(err.statusCode).send({
      error: err.message,
      code: err.code,
      details: {},
    });
    return;
  }
  throw err;
}

export async function domainRoutes(app: FastifyInstance) {
  const service = new DomainService(app.prisma);

  // ---------------------------------------------------------------------------
  // GET /api/domains — list domains
  // ---------------------------------------------------------------------------
  app.get(
    "/",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const query = DomainListQuerySchema.parse(request.query);
        return await service.list(request.userId!, query);
      } catch (err) {
        handleDomainError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/domains — add domain to project (201 Created)
  // ---------------------------------------------------------------------------
  app.post(
    "/",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const input = CreateDomainSchema.parse(request.body);
        const result = await service.create(request.userId!, input);
        reply.status(201);
        return result;
      } catch (err) {
        handleDomainError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /api/domains/:id — get domain details
  // ---------------------------------------------------------------------------
  app.get(
    "/:id",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = DomainIdParamSchema.parse(request.params);
        return await service.getById(request.userId!, id);
      } catch (err) {
        handleDomainError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/domains/:id/verify — trigger DNS TXT verification
  // ---------------------------------------------------------------------------
  app.post(
    "/:id/verify",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = DomainIdParamSchema.parse(request.params);
        const query = VerifyDomainQuerySchema.parse(request.query);
        return await service.verify(
          request.userId!,
          id,
          query.mockRecord,
          query.mock === "true",
        );
      } catch (err) {
        handleDomainError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // DELETE /api/domains/:id — remove domain (204 No Content)
  // ---------------------------------------------------------------------------
  app.delete(
    "/:id",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = DomainIdParamSchema.parse(request.params);
        await service.delete(request.userId!, id);
        reply.status(204).send();
      } catch (err) {
        handleDomainError(err, reply);
      }
    },
  );
}
