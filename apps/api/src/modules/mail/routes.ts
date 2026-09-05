import type { FastifyInstance, FastifyReply } from "fastify";
import { MailService, MailError } from "./service.js";
import {
  SendTestEmailSchema,
  MailDomainParamSchema,
} from "./schema.js";
import { isZodError, handleZodError } from "../../plugins/error-handler.js";

function handleMailError(err: unknown, reply: FastifyReply): void {
  if (err instanceof MailError) {
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

export async function mailRoutes(app: FastifyInstance) {
  const service = new MailService(app.prisma);

  // ---------------------------------------------------------------------------
  // GET /api/mail/status — SMTP Server & Port Diagnostics
  // ---------------------------------------------------------------------------
  app.get(
    "/status",
    { preHandler: [app.requireAuth] },
    async (_request, reply) => {
      try {
        const status = await service.getStatus();
        return reply.status(200).send(status);
      } catch (err) {
        handleMailError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /api/mail/domains — List Virtual Domains & DKIM state
  // ---------------------------------------------------------------------------
  app.get(
    "/domains",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const domains = await service.listVirtualDomains(request.userId!);
        return reply.status(200).send({ domains });
      } catch (err) {
        handleMailError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/mail/sync — Synchronize virtual domains from DB to Postfix
  // ---------------------------------------------------------------------------
  app.post(
    "/sync",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const result = await service.syncVirtualDomains(request.userId!);
        return reply.status(200).send(result);
      } catch (err) {
        handleMailError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/mail/dkim/:domainId — Generate or retrieve DKIM record
  // ---------------------------------------------------------------------------
  app.post(
    "/dkim/:domainId",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { domainId } = MailDomainParamSchema.parse(request.params);
        const result = await service.getOrGenerateDkim(request.userId!, domainId);
        return reply.status(200).send(result);
      } catch (err) {
        handleMailError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/mail/auth/:domainId/regenerate — Regenerate SPF/DKIM/DMARC/MX
  // ---------------------------------------------------------------------------
  app.post(
    "/auth/:domainId/regenerate",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const { domainId } = MailDomainParamSchema.parse(request.params);
        const result = await service.ensureEmailAuthRecords(request.userId!, domainId);
        return reply.status(200).send(result);
      } catch (err) {
        handleMailError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/mail/test-send — Send test email with TLS handshake verification
  // ---------------------------------------------------------------------------
  app.post(
    "/test-send",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      try {
        const parsedBody = SendTestEmailSchema.parse(request.body);
        const result = await service.sendTestEmail(request.userId!, parsedBody);
        return reply.status(200).send(result);
      } catch (err) {
        handleMailError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /api/mail/webmail/status — Roundcube webmail container health
  // ---------------------------------------------------------------------------
  app.get(
    "/webmail/status",
    { preHandler: [app.requireAuth] },
    async (_request, reply) => {
      try {
        const status = await service.getWebmailStatus();
        return reply.status(200).send(status);
      } catch (err) {
        handleMailError(err, reply);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // GET /api/mail/test-relay — Probe open relay restriction
  // ---------------------------------------------------------------------------
  app.get(
    "/test-relay",
    { preHandler: [app.requireAuth] },
    async (_request, reply) => {
      try {
        const result = await service.testOpenRelay();
        return reply.status(200).send(result);
      } catch (err) {
        handleMailError(err, reply);
      }
    },
  );
}
