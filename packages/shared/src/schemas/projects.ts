import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums (mirror Prisma — kept in sync manually)
// ---------------------------------------------------------------------------

export const ProjectTypeSchema = z.enum([
  "NODEJS",
  "NEXTJS",
  "PYTHON",
  "REACT",
  "STATIC",
  "PHP",
  "WORDPRESS",
  "DOCKER",
]);

export const ProjectStatusSchema = z.enum([
  "CREATING",
  "ACTIVE",
  "STOPPED",
  "ERROR",
  "DELETED",
]);

// ---------------------------------------------------------------------------
// Project name — shared rule used in create + update
// ---------------------------------------------------------------------------

const projectNameSchema = z
  .string()
  .min(1, "Project name is required")
  .max(60, "Project name must be 60 characters or fewer")
  // Lowercase letters, numbers, and hyphens only (URL-safe)
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
    "Name must be lowercase, alphanumeric, and may contain hyphens (e.g. my-app)",
  );

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const CreateProjectSchema = z.object({
  name: projectNameSchema,
  type: ProjectTypeSchema,
  gitUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  branch: z.string().min(1).max(255).default("main"),
  buildCmd: z.string().max(500).optional(),
  startCmd: z.string().max(500).optional(),
  port: z.number().int().min(1).max(65535).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// ---------------------------------------------------------------------------
// Update — all fields optional
// ---------------------------------------------------------------------------

export const UpdateProjectSchema = z.object({
  name: projectNameSchema.optional(),
  gitUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  branch: z.string().min(1).max(255).optional(),
  buildCmd: z.string().max(500).optional(),
  startCmd: z.string().max(500).optional(),
  port: z.number().int().min(1).max(65535).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided for update",
);

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ---------------------------------------------------------------------------
// List query — offset pagination
// ---------------------------------------------------------------------------

export const ProjectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: ProjectTypeSchema.optional(),
  status: ProjectStatusSchema.optional(),
  search: z.string().max(100).optional(),
});

export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;
