import { z } from "zod";

/**
 * Schema representing a mailbox vacation auto-responder in API responses.
 */
export const VacationResponderSchema = z.object({
  id: z.string(),
  mailboxId: z.string(),
  enabled: z.boolean(),
  subject: z.string(),
  message: z.string(),
  intervalDays: z.number().int().min(1).max(30),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type VacationResponderResponse = z.infer<typeof VacationResponderSchema>;

/**
 * Schema validating vacation auto-responder updates.
 */
export const UpdateVacationResponderSchema = z.object({
  enabled: z.boolean().default(false),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(255, "Subject cannot exceed 255 characters")
    .default("Out of office: Auto-reply"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(10000, "Message cannot exceed 10000 characters"),
  intervalDays: z
    .number()
    .int()
    .min(1, "Interval must be at least 1 day")
    .max(30, "Interval cannot exceed 30 days")
    .default(1),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export type UpdateVacationResponderInput = z.infer<typeof UpdateVacationResponderSchema>;
