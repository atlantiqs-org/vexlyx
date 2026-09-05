import { z } from "zod";
import {
  CreateMailboxSchema,
  UpdateMailboxQuotaSchema,
  MailboxListQuerySchema,
  MailboxSchema,
  MailboxPasswordResultSchema,
} from "@vexlyx/shared";

export {
  CreateMailboxSchema,
  UpdateMailboxQuotaSchema,
  MailboxListQuerySchema,
  MailboxSchema,
  MailboxPasswordResultSchema,
};

export type {
  CreateMailboxInput,
  UpdateMailboxQuotaInput,
  MailboxListQuery,
  MailboxResponse,
  MailboxPasswordResult,
} from "@vexlyx/shared";

export const MailboxIdParamSchema = z.object({
  id: z.string().min(1, "Mailbox ID is required"),
});

export type MailboxIdParam = z.infer<typeof MailboxIdParamSchema>;
