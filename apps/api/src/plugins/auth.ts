import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import crypto from "node:crypto";
import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string | null;
  }
  interface FastifyInstance {
    requireAuth: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

interface SessionData {
  userId: string;
  expiresAt: number;
}

const SESSION_COOKIE = "vexlyx_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function sessionKey(id: string) {
  return `session:${id}`;
}

async function authPlugin(app: FastifyInstance) {
  await app.register(import("@fastify/cookie"));

  app.decorateRequest("userId", null);

  // On every request, check for session cookie and populate request.userId
  app.addHook("onRequest", async (request) => {
    const sessionId = request.cookies[SESSION_COOKIE];
    if (!sessionId) return;

    const raw = await app.redis.get(sessionKey(sessionId));
    if (!raw) return;

    try {
      const session: SessionData = JSON.parse(raw);

      if (Date.now() > session.expiresAt) {
        await app.redis.del(sessionKey(sessionId));
        return;
      }

      request.userId = session.userId;
    } catch {
      await app.redis.del(sessionKey(sessionId));
    }
  });

  // Shared preHandler hook to require authentication
  const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({
        error: "Authentication required",
        code: "UNAUTHORIZED",
        details: {},
      });
    }
  };

  app.decorate("requireAuth", requireAuth);
}

export const authSessionPlugin = fp(authPlugin, {
  name: "auth",
  dependencies: ["redis"],
});

// --- Session helpers used by auth routes ---

export async function createSession(
  app: FastifyInstance,
  reply: FastifyReply,
  userId: string,
): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

  const sessionData: SessionData = { userId, expiresAt };

  await app.redis.set(
    sessionKey(sessionId),
    JSON.stringify(sessionData),
    "EX",
    SESSION_TTL_SECONDS,
  );

  // Also store in PostgreSQL for audit trail
  await app.prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt: new Date(expiresAt),
    },
  });

  reply.setCookie(SESSION_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });

  return sessionId;
}

export async function destroySession(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const sessionId = request.cookies[SESSION_COOKIE];
  if (!sessionId) return;

  await app.redis.del(sessionKey(sessionId));

  // Remove from PostgreSQL as well
  await app.prisma.session.delete({ where: { id: sessionId } }).catch(() => {
    // Session may already have been cleaned up
  });

  // Must match the Domain the cookie was set with (createSession above) —
  // otherwise this clears a different (host-only) cookie and leaves the
  // real, domain-scoped session cookie in the browser untouched.
  reply.clearCookie(SESSION_COOKIE, {
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
}
