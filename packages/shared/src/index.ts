/** Current version of the Vexlyx platform */
export const VEXLYX_VERSION = "0.0.1";

/** Application name constant used across both frontend and backend */
export const APP_NAME = "Vexlyx";

export { RegisterSchema, LoginSchema } from "./schemas/auth.js";
export type { RegisterInput, LoginInput } from "./schemas/auth.js";

export {
  ProjectTypeSchema,
  ProjectStatusSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectListQuerySchema,
  ConnectRepoSchema,
} from "./schemas/projects.js";
export type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectListQuery,
  ConnectRepoInput,
  GitMetadata,
} from "./schemas/projects.js";

export type {
  User,
  Role,
  ApiError,
  Project,
  ProjectType,
  ProjectStatus,
  PaginatedProjects,
} from "./types/index.js";
