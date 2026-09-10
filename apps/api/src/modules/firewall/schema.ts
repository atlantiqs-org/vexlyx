import { z } from "zod";
import { CreateFirewallRuleSchema, UpdateFirewallSettingsSchema } from "@vexlyx/shared";

export { CreateFirewallRuleSchema, UpdateFirewallSettingsSchema };
export type CreateFirewallRuleInput = z.infer<typeof CreateFirewallRuleSchema>;
export type UpdateFirewallSettingsInput = z.infer<typeof UpdateFirewallSettingsSchema>;

export const FirewallRuleIdParamSchema = z.object({
  id: z.string().min(1),
});
export type FirewallRuleIdParam = z.infer<typeof FirewallRuleIdParamSchema>;
