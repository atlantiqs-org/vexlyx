import { z } from "zod";
import { RestoreItemSchema, UpdateBackupSettingsSchema } from "@vexlyx/shared";

export { RestoreItemSchema, UpdateBackupSettingsSchema };
export type RestoreItemInput = z.infer<typeof RestoreItemSchema>;
export type UpdateBackupSettingsInput = z.infer<typeof UpdateBackupSettingsSchema>;

export const SnapshotIdParamSchema = z.object({
  id: z.string().min(1),
});
export type SnapshotIdParam = z.infer<typeof SnapshotIdParamSchema>;
