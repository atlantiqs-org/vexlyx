import type { FastifyInstance } from "fastify";
import { SystemService } from "./service.js";

export async function systemRoutes(app: FastifyInstance) {
  const service = new SystemService();

  // GET /api/system/dns-info — public IP + required DNS records (F5.9),
  // surfaced by the Settings page (F5.11) as a post-install reference.
  app.get("/dns-info", { preHandler: [app.requireRole("ADMIN")] }, async () => {
    return service.getDnsOnboardingInfo();
  });

  // POST /api/system/dns-info/verify — live-checks each record against
  // public resolvers. POST (not GET) since it triggers real outbound DNS
  // queries rather than reading a cached/static value, mirroring
  // domains/:id/dns/:recordId/propagation's same POST-for-live-check convention.
  app.post("/dns-info/verify", { preHandler: [app.requireRole("ADMIN")] }, async () => {
    return service.verifyDnsRecords();
  });
}
