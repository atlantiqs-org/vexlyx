import type { FastifyInstance } from "fastify";
import { VEXLYX_VERSION } from "@vexlyx/shared";

/**
 * Health check module — `GET /api/health`.
 * Returns server status, current version, and uptime in seconds.
 * Used by monitoring tools and load balancers to verify the API is alive.
 * @param app - The Fastify instance to register routes on
 */
export async function healthRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      status: "ok",
      version: VEXLYX_VERSION,
      uptime: process.uptime(),
    };
  });
}
