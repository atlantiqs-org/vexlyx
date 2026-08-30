import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";
import type { Redis } from "ioredis";
import { env } from "../config/env.js";

// ---------------------------------------------------------------------------
// Module-level singleton so other modules can call getIO() without circular deps
// ---------------------------------------------------------------------------

let _io: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!_io) throw new Error("Socket.io server not yet initialised");
  return _io;
}

// ---------------------------------------------------------------------------
// Session resolution (mirrors auth.ts logic)
// ---------------------------------------------------------------------------

interface SessionData {
  userId: string;
  expiresAt: number;
}

const SESSION_COOKIE = "vexlyx_session";

function sessionKey(id: string) {
  return `session:${id}`;
}

function extractSessionId(socket: any): string | null {
  const cookieHeader = socket.handshake?.headers?.cookie;
  if (cookieHeader) {
    for (const part of cookieHeader.split(";")) {
      const [key, val] = part.trim().split("=");
      if (key?.trim() === SESSION_COOKIE) {
        return decodeURIComponent(val?.trim() ?? "");
      }
    }
  }
  const authSession = socket.handshake?.auth?.sessionId || socket.handshake?.auth?.token;
  if (authSession && typeof authSession === "string") {
    return authSession;
  }
  return null;
}

async function resolveUserId(redis: Redis, sessionId: string): Promise<string | null> {
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;

  try {
    const session: SessionData = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      await redis.del(sessionKey(sessionId));
      return null;
    }
    return session.userId;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

async function initSocketPlugin(app: FastifyInstance) {
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: (origin, callback) => {
        // Allow same-origin, configured CORS_ORIGIN, or any localhost / LAN IP in development
        if (
          !origin ||
          env.NODE_ENV !== "production" ||
          origin === env.CORS_ORIGIN ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          callback(null, true);
        } else {
          callback(null, env.CORS_ORIGIN);
        }
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  _io = io;

  // Authenticate every incoming connection via session cookie
  io.use(async (socket, next) => {
    const sessionId = extractSessionId(socket);

    if (!sessionId) {
      app.log.warn({ socketId: socket.id }, "Socket connection rejected: No session cookie");
      return next(new Error("UNAUTHORIZED"));
    }

    const userId = await resolveUserId(app.redis, sessionId);
    if (!userId) {
      app.log.warn({ socketId: socket.id }, "Socket connection rejected: Invalid session");
      return next(new Error("UNAUTHORIZED"));
    }

    // Store userId on the socket for downstream handlers
    socket.data.userId = userId as string;
    next();
  });

  io.on("connection", (socket) => {
    app.log.debug({ socketId: socket.id, userId: socket.data.userId as string }, "Socket connected");

    socket.on("disconnect", (reason) => {
      app.log.debug({ socketId: socket.id, reason }, "Socket disconnected");
    });
  });

  // Graceful shutdown: close socket server when Fastify closes
  app.addHook("onClose", async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });

  app.log.info("Socket.io server attached");
}

export const socketPlugin = fp(initSocketPlugin, {
  name: "socket",
  dependencies: ["redis"],
});

