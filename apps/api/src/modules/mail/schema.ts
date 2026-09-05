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
} from "@vexlyx/shared";

export const MailDomainParamSchema = z.object({
  domainId: z.string().min(1, "Domain ID is required"),
});

export type MailDomainParam = z.infer<typeof MailDomainParamSchema>;
