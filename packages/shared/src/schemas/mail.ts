import { z } from "zod";

/**
 * Schema validating Dovecot IMAP server diagnostics and service status.
 */
export const ImapStatusSchema = z.object({
  service: z.literal("dovecot"),
  status: z.enum(["active", "inactive", "error"]),
  port143Open: z.boolean(),
  port993Open: z.boolean(),
  tlsEnforced: z.boolean(),
  saslAuthConnected: z.boolean(),
  activeMailboxesCount: z.number().int().nonnegative(),
  lastChecked: z.string(),
});

export type ImapStatusResponse = z.infer<typeof ImapStatusSchema>;

/**
 * Schema validating SMTP server diagnostics and service status.
 */
export const SmtpStatusSchema = z.object({
  service: z.literal("postfix"),
  status: z.enum(["active", "inactive", "error"]),
  port25Open: z.boolean(),
  port587Open: z.boolean(),
  tlsEnforced: z.boolean(),
  openRelayProtected: z.boolean(),
  openDkimConnected: z.boolean(),
  activeVirtualDomainsCount: z.number().int().nonnegative(),
  queueCount: z.number().int().nonnegative(),
  lastChecked: z.string(),
  /** Dovecot IMAP status (F4.2), attached alongside SMTP status for a single combined mail health check. */
  imap: ImapStatusSchema.optional(),
});

export type SmtpStatusResponse = z.infer<typeof SmtpStatusSchema>;

/**
 * Schema validating DKIM public key and DNS TXT record details.
 */
export const DkimRecordSchema = z.object({
  domain: z.string(),
  selector: z.string().default("default"),
  dnsRecordName: z.string(),
  dnsRecordValue: z.string(),
  publicKey: z.string(),
  keyLength: z.number().int().default(2048),
  inDns: z.boolean().default(false),
});

export type DkimRecordResponse = z.infer<typeof DkimRecordSchema>;

/**
 * Schema for a virtual domain registered with Postfix.
 */
export const VirtualDomainSchema = z.object({
  domainId: z.string(),
  hostname: z.string(),
  status: z.string(),
  dkimEnabled: z.boolean(),
  dkimRecord: DkimRecordSchema.optional(),
  mailboxCount: z.number().int().default(0),
});

export type VirtualDomain = z.infer<typeof VirtualDomainSchema>;

/**
 * Schema validating test email delivery requests.
 */
export const SendTestEmailSchema = z.object({
  from: z.string().email("Invalid sender email address"),
  to: z.string().email("Invalid recipient email address"),
  subject: z.string().min(1, "Subject is required").default("Vexlyx SMTP Diagnostics Test"),
  body: z
    .string()
    .min(1, "Body is required")
    .default("This is an automated test email sent via Vexlyx Postfix SMTP service to verify TLS and DKIM."),
  port: z.union([z.literal(25), z.literal(587)]).default(587),
  useTls: z.boolean().default(true),
  username: z.string().optional(),
  password: z.string().optional(),
});

export type SendTestEmailInput = z.infer<typeof SendTestEmailSchema>;

/**
 * Schema representing the result of an SMTP test delivery attempt.
 */
export const TestEmailResultSchema = z.object({
  success: z.boolean(),
  messageId: z.string().nullable(),
  transcript: z.array(z.string()),
  error: z.string().nullable(),
  tlsVersion: z.string().optional(),
  cipherSuite: z.string().optional(),
});

export type TestEmailResultResponse = z.infer<typeof TestEmailResultSchema>;

/**
 * Schema for synchronizing virtual domains from database to Postfix.
 */
export const SyncVirtualDomainsSchema = z.object({
  domains: z.array(z.string()).min(0),
});

export type SyncVirtualDomainsInput = z.infer<typeof SyncVirtualDomainsSchema>;
