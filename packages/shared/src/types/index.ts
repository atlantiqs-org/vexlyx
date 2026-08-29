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
