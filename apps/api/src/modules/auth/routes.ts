import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { RegisterSchema, LoginSchema } from "./schema.js";
import { AuthService, AuthError } from "./service.js";
import { createSession, destroySession } from "../../plugins/auth.js";
import { env } from "../../config/env.js";


export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService(app.prisma);

  // Register rate limiting plugin for this scope
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.ip,
  });

  // POST /api/auth/register
  app.post("/register", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
      },
    },
    handler: async (request, reply) => {
      if (!env.ALLOW_REGISTRATION) {
        reply.status(403).send({
          error: "Registration is disabled",
          code: "REGISTRATION_DISABLED",
          details: {},
        });
        return;
      }

      try {
        const data = RegisterSchema.parse(request.body);
        const user = await service.register(data);

        await createSession(app, reply, user.id);

        reply.status(201).send({ user });
      } catch (err) {
        if (err instanceof AuthError) {
          reply.status(err.statusCode).send({
            error: err.message,
            code: err.code,
            details: {},
          });
          return;
        }
        throw err;
      }
    },
  });

  // POST /api/auth/login
  app.post("/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
      },
    },
    handler: async (request, reply) => {
      try {
        const data = LoginSchema.parse(request.body);
        const user = await service.login(data);

        await createSession(app, reply, user.id);

        return { user };
      } catch (err) {
        if (err instanceof AuthError) {
          reply.status(err.statusCode).send({
            error: err.message,
            code: err.code,
            details: {},
          });
          return;
        }
        throw err;
      }
    },
  });

  // POST /api/auth/logout — no rate limit
  app.post("/logout", async (request, reply) => {
    await destroySession(app, request, reply);
    return { message: "Logged out" };
  });

  // GET /api/auth/me — no rate limit
  app.get(
    "/me",
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = await service.getCurrentUser(request.userId!);
      return { user };
    },
  );

  // GET /api/auth/config — public, lets the dashboard know whether to show
  // the self-registration form/link (F5.8).
  app.get("/config", async () => {
    return { allowRegistration: env.ALLOW_REGISTRATION };
  });
}
