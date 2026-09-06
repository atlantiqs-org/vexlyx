import { z } from "zod";

export const MailboxIdParamSchema = z.object({
  id: z.string().min(1, "Mailbox ID is required"),
});

export type MailboxIdParam = z.infer<typeof MailboxIdParamSchema>;
