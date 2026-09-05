import { z } from "zod";

/**
 * Schema mirroring the Prisma `MailboxStatus` enum.
 */
export const MailboxStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "DELETED"]);

export type MailboxStatus = z.infer<typeof MailboxStatusSchema>;

/**
 * Quota presets in megabytes. `0` means unlimited.
 */
export const QuotaPresetSchema = z.union([
  z.literal(256),
  z.literal(512),
  z.literal(1024),
  z.literal(5120),
  z.literal(10240),
  z.literal(0),
]);

export type QuotaPreset = z.infer<typeof QuotaPresetSchema>;

/**
 * Schema validating new mailbox creation requests. Passwords are generated
 * server-side and never accepted from the client.
 */
export const CreateMailboxSchema = z.object({
  localPart: z
    .string()
    .min(1, "Local part is required")
    .max(64, "Local part is too long")
    .regex(/^[a-z0-9][a-z0-9._-]*$/, "Only lowercase letters, numbers, dots, hyphens, and underscores allowed"),
  domainId: z.string().min(1, "Domain is required"),
  quota: QuotaPresetSchema.default(1024),
});

export type CreateMailboxInput = z.infer<typeof CreateMailboxSchema>;

/**
 * Schema validating mailbox quota updates.
 */
export const UpdateMailboxQuotaSchema = z.object({
  quota: QuotaPresetSchema,
});

export type UpdateMailboxQuotaInput = z.infer<typeof UpdateMailboxQuotaSchema>;

/**
 * Schema for the mailbox list query filter.
 */
export const MailboxListQuerySchema = z.object({
  domainId: z.string().optional(),
});

export type MailboxListQuery = z.infer<typeof MailboxListQuerySchema>;

/**
 * Schema representing a mailbox in API responses.
 */
export const MailboxSchema = z.object({
  id: z.string(),
  address: z.string(),
  domainId: z.string(),
  hostname: z.string(),
  quota: z.number().int(),
  status: MailboxStatusSchema,
  usedBytes: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type MailboxResponse = z.infer<typeof MailboxSchema>;

/**
 * Schema for the one-time plaintext password returned on create/reset.
 */
export const MailboxPasswordResultSchema = z.object({
  password: z.string(),
});

export type MailboxPasswordResult = z.infer<typeof MailboxPasswordResultSchema>;
