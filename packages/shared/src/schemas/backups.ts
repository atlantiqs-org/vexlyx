import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const BackupStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);
export type BackupStatus = z.infer<typeof BackupStatusSchema>;

export const BackupTriggerSchema = z.enum(["SCHEDULED", "MANUAL"]);
export type BackupTrigger = z.infer<typeof BackupTriggerSchema>;

export const BackupItemTypeSchema = z.enum([
  "project",
  "database",
  "mail",
  "dns",
]);
export type BackupItemType = z.infer<typeof BackupItemTypeSchema>;

// ---------------------------------------------------------------------------
// Manifest — index of what a snapshot's archive contains
// ---------------------------------------------------------------------------

export const BackupManifestDnsRecordSchema = z.object({
  type: z.string(),
  name: z.string(),
  value: z.string(),
  ttl: z.number().int(),
  priority: z.number().int().nullable(),
  weight: z.number().int().nullable(),
  port: z.number().int().nullable(),
});

export const BackupManifestSchema = z.object({
  projects: z.array(
    z.object({ id: z.string(), name: z.string(), sizeBytes: z.number().nonnegative(), checksum: z.string() }),
  ),
  databases: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["POSTGRESQL", "MYSQL"]),
      sizeBytes: z.number().nonnegative(),
      checksum: z.string(),
    }),
  ),
  mail: z.array(
    z.object({ domainId: z.string(), hostname: z.string(), sizeBytes: z.number().nonnegative(), checksum: z.string() }),
  ),
  dns: z.array(
    z.object({
      domainId: z.string(),
      hostname: z.string(),
      records: z.array(BackupManifestDnsRecordSchema),
    }),
  ),
});
export type BackupManifest = z.infer<typeof BackupManifestSchema>;

// ---------------------------------------------------------------------------
// Snapshot (API response shape)
// ---------------------------------------------------------------------------

export const BackupSnapshotSchema = z.object({
  id: z.string(),
  status: BackupStatusSchema,
  trigger: BackupTriggerSchema,
  archivePath: z.string().nullable(),
  sizeBytes: z.number().nonnegative().nullable(),
  manifest: BackupManifestSchema.nullable(),
  error: z.string().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type BackupSnapshotResponse = z.infer<typeof BackupSnapshotSchema>;

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export const RestoreItemSchema = z.object({
  itemType: BackupItemTypeSchema,
  itemId: z.string().min(1),
});
export type RestoreItemInput = z.infer<typeof RestoreItemSchema>;

export const BackupSettingsSchema = z.object({
  scheduleCron: z.string().min(1),
  retentionDaily: z.number().int().min(1),
  retentionWeekly: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});
export type BackupSettingsResponse = z.infer<typeof BackupSettingsSchema>;

export const UpdateBackupSettingsSchema = z.object({
  scheduleCron: z
    .string()
    .min(1)
    // Minimal 5-field cron shape check (minute hour day month weekday);
    // full validity is left to BullMQ's own cron parser at schedule time.
    .regex(/^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/, "Must be a 5-field cron expression"),
  retentionDaily: z.number().int().min(1).max(90),
  retentionWeekly: z.number().int().min(0).max(52),
});
export type UpdateBackupSettingsInput = z.infer<typeof UpdateBackupSettingsSchema>;
