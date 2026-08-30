import { z } from "zod";
import {
  SetEnvVarSchema,
  BulkSetEnvVarsSchema,
  ImportEnvFileSchema,
} from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Route Parameter Schemas
// ---------------------------------------------------------------------------

export const ProjectIdParamSchema = z.object({
  id: z.string().min(1, "Project ID is required"),
});

export type ProjectIdParam = z.infer<typeof ProjectIdParamSchema>;

export const EnvKeyParamSchema = z.object({
  id: z.string().min(1, "Project ID is required"),
  key: z.string().min(1, "Variable key is required"),
});

export type EnvKeyParam = z.infer<typeof EnvKeyParamSchema>;

// ---------------------------------------------------------------------------
// Combined Upsert Body Schema
// Allows either a single { key, value } or bulk { variables: [...] }
// ---------------------------------------------------------------------------

export const UpsertEnvBodySchema = z.union([
  SetEnvVarSchema,
  BulkSetEnvVarsSchema,
]);

export type UpsertEnvBody = z.infer<typeof UpsertEnvBodySchema>;

export { ImportEnvFileSchema };
