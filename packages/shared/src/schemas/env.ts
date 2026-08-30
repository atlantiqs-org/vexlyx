import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

/**
 * Validates standard environment variable key names.
 * Standard POSIX rule: letters, digits, and underscores, cannot start with a digit.
 */
export const EnvVarKeySchema = z
  .string()
  .min(1, "Variable key is required")
  .max(255, "Variable key must be 255 characters or fewer")
  .regex(
    /^[A-Za-z_][A-Za-z0-9_]*$/,
    "Key must start with a letter or underscore and contain only letters, numbers, and underscores (e.g. DATABASE_URL)",
  );

/**
 * Validates environment variable value.
 * Supports strings up to 10,000 characters (e.g. multiline private keys, large JSON strings).
 */
export const EnvVarValueSchema = z
  .string()
  .max(10000, "Value must be 10,000 characters or fewer");

// ---------------------------------------------------------------------------
// Request Schemas
// ---------------------------------------------------------------------------

/** Schema for creating or updating a single environment variable */
export const SetEnvVarSchema = z.object({
  key: EnvVarKeySchema,
  value: EnvVarValueSchema,
});

export type SetEnvVarInput = z.infer<typeof SetEnvVarSchema>;

/** Schema for bulk upserting environment variables */
export const BulkSetEnvVarsSchema = z.object({
  variables: z
    .array(SetEnvVarSchema)
    .min(1, "At least one variable is required")
    .max(500, "Maximum 500 variables allowed per batch"),
});

export type BulkSetEnvVarsInput = z.infer<typeof BulkSetEnvVarsSchema>;

/** Schema for importing raw .env file text content */
export const ImportEnvFileSchema = z.object({
  content: z
    .string()
    .min(1, ".env content is required")
    .max(100000, ".env content exceeds 100KB limit"),
  overwrite: z.boolean().default(false),
});

export type ImportEnvFileInput = z.infer<typeof ImportEnvFileSchema>;
