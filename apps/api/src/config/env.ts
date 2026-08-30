import { z } from "zod";

/**
 * Zod schema defining all required environment variables for the API server.
 * Validates types and provides sensible defaults for local development.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().min(1).default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SESSION_SECRET: z.string().min(32),
  ALLOW_REGISTRATION: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Git integration (F1.3)
  PROJECTS_DIR: z.string().min(1).default("./workspaces/projects"),
  SSH_KEYS_DIR: z.string().min(1).default("./workspaces/keys"),
  API_BASE_URL: z.string().url().default("http://localhost:5000"),
  // Build integration (F1.4)
  NIXPACKS_IMAGE_PREFIX: z.string().min(1).default("vexlyx"),
});

/**
 * Parses and validates environment variables against the Zod schema.
 * Throws a descriptive error on startup if any variables are invalid or missing.
 * @returns Typed, validated environment object
 * @throws Error with per-field messages if validation fails
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

/** Inferred TypeScript type from the environment schema */
export type Env = z.infer<typeof envSchema>;

/** Validated environment variables — safe to use throughout the API */
export const env = validateEnv();
