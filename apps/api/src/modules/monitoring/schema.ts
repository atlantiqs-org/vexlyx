import { z } from "zod";
import { MetricsQuerySchema } from "@vexlyx/shared";

export { MetricsQuerySchema };
export type MetricsQueryInput = z.infer<typeof MetricsQuerySchema>;
