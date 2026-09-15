import { z } from "zod";

// ---------------------------------------------------------------------------
// Server timezone (F5.13) — singleton row, defaults to the server's detected
// local timezone at first read but is overridable from the dashboard.
// Governs the BullMQ backup cron's `tz` option and (optionally) how
// timestamps are displayed across the dashboard.
// ---------------------------------------------------------------------------

export const SystemSettingsSchema = z.object({
  timezone: z.string().min(1),
  updatedAt: z.string().datetime(),
});
export type SystemSettingsResponse = z.infer<typeof SystemSettingsSchema>;

// IANA timezone identifiers only — validated against the runtime's own
// database rather than a hardcoded list, so it stays correct as the tz
// database updates.
export const UpdateSystemSettingsSchema = z.object({
  timezone: z.string().min(1).refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be a valid IANA timezone identifier (e.g. America/New_York)" },
  ),
});
export type UpdateSystemSettingsInput = z.infer<typeof UpdateSystemSettingsSchema>;
