import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const FirewallProtocolSchema = z.enum(["TCP", "UDP"]);
export type FirewallProtocol = z.infer<typeof FirewallProtocolSchema>;

export const FirewallActionSchema = z.enum(["ALLOW", "DENY"]);
export type FirewallAction = z.infer<typeof FirewallActionSchema>;

export const FirewallPolicySchema = z.enum(["ALLOW", "DENY"]);
export type FirewallPolicy = z.infer<typeof FirewallPolicySchema>;

// ---------------------------------------------------------------------------
// Rule (API response shape)
// ---------------------------------------------------------------------------

// A basic IPv4/IPv6 address or CIDR check — full validity is left to UFW
// itself, this just rejects obviously malformed input before it reaches a
// shell-invoked command.
const SOURCE_PATTERN = /^[0-9a-fA-F.:]+(\/[0-9]{1,3})?$/;

export const FirewallRuleSchema = z.object({
  id: z.string(),
  port: z.number().int().min(1).max(65535),
  protocol: FirewallProtocolSchema,
  source: z.string().nullable(),
  action: FirewallActionSchema,
  comment: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
  // false for a rule that exists live in UFW but wasn't created through the
  // panel (e.g. the installer's baseline SSH/HTTP/HTTPS/mail rules) — shown
  // for visibility but not deletable through this API.
  managed: z.boolean(),
});
export type FirewallRuleResponse = z.infer<typeof FirewallRuleSchema>;

export const CreateFirewallRuleSchema = z.object({
  port: z.number().int().min(1).max(65535),
  protocol: FirewallProtocolSchema,
  source: z.string().regex(SOURCE_PATTERN, "Must be a valid IP or CIDR").optional(),
  action: FirewallActionSchema,
  comment: z.string().max(255).optional(),
});
export type CreateFirewallRuleInput = z.infer<typeof CreateFirewallRuleSchema>;

// ---------------------------------------------------------------------------
// Status — live UFW state + default policy
// ---------------------------------------------------------------------------

export const FirewallSettingsSchema = z.object({
  defaultIncoming: FirewallPolicySchema,
  defaultOutgoing: FirewallPolicySchema,
  updatedAt: z.string().datetime(),
});
export type FirewallSettingsResponse = z.infer<typeof FirewallSettingsSchema>;

export const UpdateFirewallSettingsSchema = z.object({
  defaultIncoming: FirewallPolicySchema,
  defaultOutgoing: FirewallPolicySchema,
});
export type UpdateFirewallSettingsInput = z.infer<typeof UpdateFirewallSettingsSchema>;

export const FirewallStatusSchema = z.object({
  active: z.boolean(),
  rules: z.array(FirewallRuleSchema),
  settings: FirewallSettingsSchema,
  protectedPorts: z.array(z.number().int()),
});
export type FirewallStatusResponse = z.infer<typeof FirewallStatusSchema>;
