import type { Server as SocketIOServer } from "socket.io";
import type { FastifyBaseLogger } from "fastify";

/**
 * Registers subscribe/unsubscribe handlers for the "backups" room, used to
 * push live backup:progress / backup:completed / restore:progress /
 * restore:completed events (emitted directly by BackupService).
 */
export function registerBackupSocketHandlers(io: SocketIOServer, logger: FastifyBaseLogger): void {
  io.on("connection", (socket) => {
    socket.on("subscribe:backups", async () => {
      await socket.join("backups");
      logger.debug({ socketId: socket.id }, "Subscribed to backups");
    });

    socket.on("unsubscribe:backups", async () => {
      await socket.leave("backups");
      logger.debug({ socketId: socket.id }, "Unsubscribed from backups");
    });
  });
}
