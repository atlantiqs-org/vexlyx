import { z } from "zod";
import {
  CreateDatabaseSchema,
  DatabaseListQuerySchema,
  type CreateDatabaseInput,
  type DatabaseListQuery,
  type DatabaseDetail,
  type DatabaseConnectionTestResult,
} from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Route Parameter Schemas
// ---------------------------------------------------------------------------

export const DatabaseIdParamSchema = z.object({
  id: z.string().min(1, "Database ID is required"),
});

export type DatabaseIdParam = z.infer<typeof DatabaseIdParamSchema>;

export {
  CreateDatabaseSchema,
  DatabaseListQuerySchema,
  type CreateDatabaseInput,
  type DatabaseListQuery,
  type DatabaseDetail,
  type DatabaseConnectionTestResult,
};
