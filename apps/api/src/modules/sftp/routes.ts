import type { FastifyInstance, FastifyReply } from "fastify";
import { SftpService, SftpError } from "./service.js";
import { SftpAddKeyBodySchema } from "./schema.js";

function handleSftpError(err: unknown, reply: FastifyReply): void {
  if (err instanceof SftpError) {
    reply.status(err.statusCode).send({
      error: err.message,
      code: err.code,
      details: {},
    });
    return;
  }
  const message = err instanceof Error ? err.message : "SFTP operation failed";
  reply.status(500).send({
    error: message,
    code: "SFTP_INTERNAL_ERROR",
    details: {},
  });
}

export async function sftpRoutes(app: FastifyInstance) {
  const service = new SftpService(app.prisma);

  // POST /api/sftp/provision
  app.post(
    "/provision",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const result = await service.provision(request.userId!, request.hostname);
        reply.status(201);
        return result;
      } catch (err) {
        handleSftpError(err, reply);
      }
    },
  );

  // GET /api/sftp/credentials
  app.get(
    "/credentials",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const result = await service.getCredentials(request.userId!, request.hostname);
        if (!result) {
          reply.status(404).send({
            error: "No SFTP account provisioned",
            code: "SFTP_NOT_PROVISIONED",
            details: {},
          });
          return;
        }
        return result;
      } catch (err) {
        handleSftpError(err, reply);
      }
    },
  );

  // POST /api/sftp/rotate-password
  app.post(
    "/rotate-password",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const result = await service.rotatePassword(request.userId!);
        return result;
      } catch (err) {
        handleSftpError(err, reply);
      }
    },
  );

  // POST /api/sftp/add-ssh-key
  app.post(
    "/add-ssh-key",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { publicKey } = SftpAddKeyBodySchema.parse(request.body);
        await service.addSshKey(request.userId!, publicKey);
        return { success: true };
      } catch (err) {
        handleSftpError(err, reply);
      }
    },
  );

  // DELETE /api/sftp/disable
  app.delete(
    "/disable",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        await service.disable(request.userId!);
        reply.status(200);
        return { success: true };
      } catch (err) {
        handleSftpError(err, reply);
      }
    },
  );

  // POST /api/sftp/enable
  app.post(
    "/enable",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        await service.enable(request.userId!);
        reply.status(200);
        return { success: true };
      } catch (err) {
        handleSftpError(err, reply);
      }
    },
  );
}
