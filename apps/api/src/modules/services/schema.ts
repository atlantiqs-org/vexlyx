import { z } from "zod";
import { ServiceNameSchema } from "@vexlyx/shared";

export const ServiceNameParamSchema = z.object({
  name: ServiceNameSchema,
});
export type ServiceNameParam = z.infer<typeof ServiceNameParamSchema>;

export const ServiceLogsQuerySchema = z.object({
  tail: z.coerce.number().int().min(1).max(1000).default(200),
});
export type ServiceLogsQuery = z.infer<typeof ServiceLogsQuerySchema>;
