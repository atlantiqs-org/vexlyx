import { z } from "zod";
import {
  CreateAliasSchema,
  UpdateAliasDestinationsSchema,
  AliasListQuerySchema,
  AliasSchema,
} from "@vexlyx/shared";

export {
  CreateAliasSchema,
  UpdateAliasDestinationsSchema,
  AliasListQuerySchema,
  AliasSchema,
};

export type {
  CreateAliasInput,
  UpdateAliasDestinationsInput,
  AliasListQuery,
  AliasResponse,
} from "@vexlyx/shared";

export const AliasIdParamSchema = z.object({
  id: z.string().min(1, "Alias ID is required"),
});

export type AliasIdParam = z.infer<typeof AliasIdParamSchema>;
