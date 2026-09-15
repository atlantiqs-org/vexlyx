import type { Queue } from "bullmq";

// ---------------------------------------------------------------------------
// Module-level singleton so other modules (system/routes.ts, on a timezone
// change) can re-upsert the backup scheduler without a circular import back
// into backups/routes.ts. Mirrors plugins/socket.ts's getIO() accessor.
// ---------------------------------------------------------------------------

export const BACKUP_SCHEDULER_ID = "daily-backup";

let _backupQueue: Queue | null = null;
let _currentCron: string | null = null;

export function registerBackupQueue(queue: Queue, cron: string): void {
  _backupQueue = queue;
  _currentCron = cron;
}

export function setCurrentBackupCron(cron: string): void {
  _currentCron = cron;
}

// Re-upserts the daily backup job with its current cron pattern but a new
// `tz`. No-op if the backup queue hasn't registered itself yet (e.g. module
// load order edge case) — the queue's own startup upsert will pick up the
// latest timezone from SystemSettings on next restart either way.
export async function rescheduleBackupJob(tz: string): Promise<void> {
  if (!_backupQueue || !_currentCron) return;
  await _backupQueue.upsertJobScheduler(
    BACKUP_SCHEDULER_ID,
    { pattern: _currentCron, tz },
    { name: "scheduled-backup", data: { trigger: "SCHEDULED" } },
  );
}
