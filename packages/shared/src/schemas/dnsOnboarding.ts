import { z } from "zod";

// ---------------------------------------------------------------------------
// DNS Records & Public IP Visibility (F5.9)
// ---------------------------------------------------------------------------

export const DnsRecordSuggestionSchema = z.object({
  type: z.literal("A"),
  host: z.string(),
  value: z.string(),
  // Human-readable note on what this record is for (panel, webmail,
  // deployed projects), shown alongside the record in the UI.
  purpose: z.string(),
});
export type DnsRecordSuggestion = z.infer<typeof DnsRecordSuggestionSchema>;

export const DnsOnboardingInfoSchema = z.object({
  // Null when the installer couldn't auto-detect a public IP (no outbound
  // internet and local route lookup failed) — the admin needs to fill it in.
  publicIp: z.string().nullable(),
  domain: z.string().nullable(),
  baseDomain: z.string(),
  records: z.array(DnsRecordSuggestionSchema),
});
export type DnsOnboardingInfoResponse = z.infer<typeof DnsOnboardingInfoSchema>;
