import type { FastifyInstance } from "fastify";
import { getIO } from "../../plugins/socket.js";
import { registerSocketHandlers } from "./service.js";

export async function logRoutes(app: FastifyInstance) {
  // Register all Socket.io event handlers once (build subscribe, runtime subscribe, etc.)
  registerSocketHandlers(getIO(), app.prisma, app.log);

  // REST fallback: GET /api/projects/:projectId/logs?tail=N
  // This mirrors the existing endpoint registered in deploy/routes.ts
  // No change needed here — the endpoint already exists in F1.5.
  // This module only provides the Socket.io layer on top.
}
