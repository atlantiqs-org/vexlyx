import { z } from "zod";
import {
  SmtpStatusSchema,
  DkimRecordSchema,
  MailAuthCheckSchema,
  MailAuthStatusSchema,
  VirtualDomainSchema,
  SendTestEmailSchema,
  TestEmailResultSchema,
  SyncVirtualDomainsSchema,
  QueueMessageSchema,
  QueueListResponseSchema,
  QueueActionResultSchema,
  DeliveryLogEntrySchema,
  DeliveryLogResponseSchema,
  DeliveryLogFilterSchema,
  DkimKeyStatusSchema,
  DkimKeySchema,
  DkimRotateResponseSchema,
  WebmailLoginActivitySchema,
  WebmailActivityResponseSchema,
} from "@vexlyx/shared";

export {
  SmtpStatusSchema,
  DkimRecordSchema,
  MailAuthCheckSchema,
  MailAuthStatusSchema,
  VirtualDomainSchema,
  SendTestEmailSchema,
  TestEmailResultSchema,
  SyncVirtualDomainsSchema,
  QueueMessageSchema,
  QueueListResponseSchema,
  QueueActionResultSchema,
  DeliveryLogEntrySchema,
  DeliveryLogResponseSchema,
  DeliveryLogFilterSchema,
  DkimKeyStatusSchema,
  DkimKeySchema,
  DkimRotateResponseSchema,
  WebmailLoginActivitySchema,
  WebmailActivityResponseSchema,
};

export type {
  SmtpStatusResponse,
  DkimRecordResponse,
  MailAuthCheck,
  MailAuthStatusResponse,
  VirtualDomain,
  SendTestEmailInput,
  TestEmailResultResponse,
  SyncVirtualDomainsInput,
  QueueMessage,
  QueueListResponse,
  QueueActionResult,
  DeliveryLogEntry,
  DeliveryLogResponse,
  DeliveryLogFilterInput,
  DkimKey,
  DkimRotateResponse,
  WebmailLoginActivity,
  WebmailActivityResponse,
} from "@vexlyx/shared";

export const MailDomainParamSchema = z.object({
  domainId: z.string().min(1, "Domain ID is required"),
});

export type MailDomainParam = z.infer<typeof MailDomainParamSchema>;

export const QueueIdParamSchema = z.object({
  queueId: z.string().regex(/^[0-9A-Fa-f]+$/, "Invalid queue ID"),
});

export type QueueIdParam = z.infer<typeof QueueIdParamSchema>;
