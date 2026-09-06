import type { FastifyInstance, FastifyReply } from "fastify";
import { VacationService, VacationError } from "./service.js";
import { MailboxIdParamSchema } from "./schema.js";
import { UpdateVacationResponderSchema } from "@vexlyx/shared";
import { isZodError, handleZodError } from "../../plugins/error-handler.js";

function handleVacationError(err: unknown, reply: FastifyReply): void {
  if (err instanceof VacationError) {
    reply.status(err.statusCode).send({
      error: err.message,
      code: err.code,
      details: {},
    });
    return;
  }
  if (isZodError(err)) {
    const { statusCode, body } = handleZodError(err);
    reply.status(statusCode).send(body);
    return;
  }
  throw err;
}

export async function vacationRoutes(app: FastifyInstance) {
  const service = new VacationService(app.prisma);

  // ---------------------------------------------------------------------------
  // GET /api/mailboxes/:id/vacation — get vacation responder config for mailbox
  // ---------------------------------------------------------------------------
  app.get(
    "/:id/vacation",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = MailboxIdParamSchema.parse(request.params);
        const responder = await service.get(request.userId!, id);
        return reply.status(200).send({ responder });
      } catch (err) {
        handleVacationError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // PUT /api/mailboxes/:id/vacation — update vacation responder config for mailbox
  // ---------------------------------------------------------------------------
  app.put(
    "/:id/vacation",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { id } = MailboxIdParamSchema.parse(request.params);
        const input = UpdateVacationResponderSchema.parse(request.body);
        const responder = await service.update(request.userId!, id, input);
        return reply.status(200).send({ responder });
      } catch (err) {
        handleVacationError(err, reply);
      }
    },
  );
}
