import { z } from "zod";

export {
  CreateSubAccountSchema,
  UpdateUserRoleSchema,
  UpdateUserQuotasSchema,
} from "@vexlyx/shared";
export type {
  CreateSubAccountInput,
  UpdateUserRoleInput,
  UpdateUserQuotasInput,
} from "@vexlyx/shared";

export const UserIdParamSchema = z.object({
  id: z.string().min(1),
});
export type UserIdParam = z.infer<typeof UserIdParamSchema>;
