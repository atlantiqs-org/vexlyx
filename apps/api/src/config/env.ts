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
  ENCRYPTION_KEY: z.string().min(32).optional(),
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
  BUILD_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(5),
  // Deploy integration (F1.5)
  // Base domain used to generate per-project Traefik hostnames: {name}.{BASE_DOMAIN}
  BASE_DOMAIN: z.string().min(1).default("vexlyx.localhost"),
  // Default memory limit passed to Docker (e.g. 128m, 256m, 512m)
  DEPLOY_MEMORY_LIMIT: z.string().min(1).default("128m"),
  // Dynamic host-port range used when no project.port is set
  DEPLOY_PORT_RANGE_START: z.coerce.number().int().min(1024).default(8100),
  DEPLOY_PORT_RANGE_END: z.coerce.number().int().max(65535).default(8999),
  // Database Provisioning (F2.6)
  POSTGRES_CONTAINER_NAME: z.string().min(1).default("vexlyx-postgres"),
  POSTGRES_HOST: z.string().min(1).default("localhost"),
  POSTGRES_PORT: z.coerce.number().int().default(5432),
  POSTGRES_USER: z.string().min(1).default("vexlyx"),
  POSTGRES_PASSWORD: z.string().min(1).default("vexlyx_dev"),
  MYSQL_CONTAINER_NAME: z.string().min(1).default("vexlyx-mysql"),
  MYSQL_HOST: z.string().min(1).default("localhost"),
  MYSQL_PORT: z.coerce.number().int().default(3306),
  MYSQL_ROOT_USER: z.string().min(1).default("root"),
  MYSQL_ROOT_PASSWORD: z.string().min(1).default("vexlyx_mysql_root"),
  ADMINER_URL: z.string().default("http://localhost:8088"),
  // Custom Domain Mock DNS (F3.1)
  VEXLYX_MOCK_DNS: z.string().optional(),
  // Email — Dovecot IMAP Server (F4.2)
  IMAP_HOST: z.string().min(1).default("127.0.0.1"),
  IMAP_PORT: z.coerce.number().int().default(143),
  IMAPS_PORT: z.coerce.number().int().default(993),
  // Webmail — Roundcube (F4.4)
  WEBMAIL_URL: z.string().default("http://localhost:8089"),
  WEBMAIL_PORT: z.coerce.number().int().default(8089),
  WEBMAIL_CONTAINER_NAME: z.string().min(1).default("vexlyx-roundcube"),
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
