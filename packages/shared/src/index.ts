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
  TriggerBuildSchema,
  DeploymentStatusSchema,
} from "./schemas/projects.js";
export type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectListQuery,
  ConnectRepoInput,
  GitMetadata,
  TriggerBuildInput,
} from "./schemas/projects.js";

export type {
  User,
  Role,
  ApiError,
  Project,
  ProjectType,
  ProjectStatus,
  PaginatedProjects,
  Deployment,
  DeploymentStatus,
  PaginatedDeployments,
} from "./types/index.js";
