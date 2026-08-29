/** User roles available in the Vexlyx platform */
export type Role = "ADMIN" | "USER";

/**
 * Public user object returned by the API.
 * Matches the select shape used in AuthService (id, email, name, role, createdAt).
 * Password is never included.
 */
export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date | string;
};

/**
 * Standard API error response shape.
 * Every error returned by the Fastify API must conform to this structure.
 */
export type ApiError = {
  error: string;
  code: string;
  details: Record<string, unknown>;
};

/** Supported project/application types — mirrors the Prisma ProjectType enum */
export type ProjectType =
  | "NODEJS"
  | "NEXTJS"
  | "PYTHON"
  | "REACT"
  | "STATIC"
  | "PHP"
  | "WORDPRESS"
  | "DOCKER";

/** Lifecycle status of a hosted project — mirrors the Prisma ProjectStatus enum */
export type ProjectStatus =
  | "CREATING"
  | "ACTIVE"
  | "STOPPED"
  | "ERROR"
  | "DELETED";

/**
 * Public project object returned by the API.
 * Sensitive internals (deletedAt) are never included in responses.
 */
export type Project = {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  gitUrl: string | null;
  branch: string;
  buildCmd: string | null;
  startCmd: string | null;
  port: number | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

/** Paginated list response wrapper for projects */
export type PaginatedProjects = {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
