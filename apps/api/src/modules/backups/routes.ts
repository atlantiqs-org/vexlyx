import type { FastifyInstance, FastifyReply } from "fastify";
import { BackupService, BackupError } from "./service.js";
import { RestoreItemSchema, UpdateBackupSettingsSchema, SnapshotIdParamSchema } from "./schema.js";
import { registerBackupSocketHandlers } from "./socket.js";
import { getIO } from "../../plugins/socket.js";
import { createQueue, createWorker } from "../../config/queue.js";

// ---------------------------------------------------------------------------
// Shared error handler
// ---------------------------------------------------------------------------

function handleBackupError(err: unknown, reply: FastifyReply): void {
  if (err instanceof BackupError) {
    reply.status(err.statusCode).send({ error: err.message, code: err.code, details: {} });
    return;
  }
  throw err;
}

// ---------------------------------------------------------------------------
// BullMQ queue name for the daily backup job
// ---------------------------------------------------------------------------

const BACKUP_QUEUE_NAME = "backup-runner";
const BACKUP_SCHEDULER_ID = "daily-backup";

export async function backupRoutes(app: FastifyInstance) {
  const service = new BackupService(app.prisma, app.log);
  const io = getIO();

  registerBackupSocketHandlers(io, app.log);

  // ---------------------------------------------------------------------------
  // BullMQ — daily scheduled backup + on-demand manual trigger
  // ---------------------------------------------------------------------------

  const backupQueue = createQueue(BACKUP_QUEUE_NAME);

  const backupWorker = createWorker<{ trigger: "SCHEDULED" | "MANUAL" }>(
    BACKUP_QUEUE_NAME,
    async (job) => {
      const snapshot = await app.prisma.backupSnapshot.create({
        data: { trigger: job.data.trigger },
      });
      await service.runBackupJob(snapshot.id, io);
    },
    app,
    { concurrency: 1 },
  );

  app.registerQueue(backupQueue, backupWorker);

  const settings = await service.getSettings();
  await backupQueue.upsertJobScheduler(
    BACKUP_SCHEDULER_ID,
    { pattern: settings.scheduleCron },
    { name: "scheduled-backup", data: { trigger: "SCHEDULED" } },
  );

  app.log.info({ cron: settings.scheduleCron }, "Daily backup job scheduled");

  // ---------------------------------------------------------------------------
  // GET /api/backups — list snapshots
  // ---------------------------------------------------------------------------

  app.get("/", { preHandler: [app.requireAuth] }, async (_request, reply) => {
    try {
      const snapshots = await service.list();
      return {
        snapshots: snapshots.map((s) => ({
          ...s,
          sizeBytes: s.sizeBytes !== null ? Number(s.sizeBytes) : null,
        })),
      };
    } catch (err) {
      handleBackupError(err, reply);
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/backups/settings — get schedule/retention config
  // ---------------------------------------------------------------------------

  app.get("/settings", { preHandler: [app.requireAuth] }, async (_request, reply) => {
    try {
      return await service.getSettings();
    } catch (err) {
      handleBackupError(err, reply);
    }
  });

  // ---------------------------------------------------------------------------
  // PUT /api/backups/settings — update schedule/retention config
  // ---------------------------------------------------------------------------

  app.put("/settings", { preHandler: [app.requireAuth] }, async (request, reply) => {
    try {
      const body = UpdateBackupSettingsSchema.parse(request.body);
      const updated = await service.updateSettings(body);

      // Re-upsert the scheduler so the new cron pattern takes effect immediately.
      await backupQueue.upsertJobScheduler(
        BACKUP_SCHEDULER_ID,
        { pattern: updated.scheduleCron },
        { name: "scheduled-backup", data: { trigger: "SCHEDULED" } },
      );

      return updated;
    } catch (err) {
      handleBackupError(err, reply);
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/backups/:id — snapshot detail (includes manifest)
  // ---------------------------------------------------------------------------

  app.get("/:id", { preHandler: [app.requireAuth] }, async (request, reply) => {
    try {
      const { id } = SnapshotIdParamSchema.parse(request.params);
      const snapshot = await service.get(id);
      return { ...snapshot, sizeBytes: snapshot.sizeBytes !== null ? Number(snapshot.sizeBytes) : null };
    } catch (err) {
      handleBackupError(err, reply);
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/backups — trigger a manual backup
  // ---------------------------------------------------------------------------

  app.post("/", { preHandler: [app.requireAuth] }, async (_request, reply) => {
    try {
      await backupQueue.add("manual-backup", { trigger: "MANUAL" });
      reply.status(202);
      return { message: "Backup queued" };
    } catch (err) {
      handleBackupError(err, reply);
    }
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/backups/:id — remove a snapshot and its archive
  // ---------------------------------------------------------------------------

  app.delete("/:id", { preHandler: [app.requireAuth] }, async (request, reply) => {
    try {
      const { id } = SnapshotIdParamSchema.parse(request.params);
      await service.delete(id);
      reply.status(204);
      return null;
    } catch (err) {
      handleBackupError(err, reply);
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/backups/:id/restore — restore a single item from a snapshot
  // ---------------------------------------------------------------------------

  app.post("/:id/restore", { preHandler: [app.requireAuth] }, async (request, reply) => {
    try {
      const { id } = SnapshotIdParamSchema.parse(request.params);
      const { itemType, itemId } = RestoreItemSchema.parse(request.body);
      await service.restoreItem(id, itemType, itemId, io);
      return { message: "Restore completed", itemType, itemId };
    } catch (err) {
      handleBackupError(err, reply);
    }
  });
}
