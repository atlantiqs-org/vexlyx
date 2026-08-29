/** Current version of the Vexlyx platform */
export const VEXLYX_VERSION = "0.0.1";

/** Application name constant used across both frontend and backend */
export const APP_NAME = "Vexlyx";

export { RegisterSchema, LoginSchema } from "./schemas/auth.js";
export type { RegisterInput, LoginInput } from "./schemas/auth.js";

export type { User, Role, ApiError } from "./types/index.js";
