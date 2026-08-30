import { z } from "zod";

export const DeployBodySchema = z.object({
  domain: z.string().max(253).optional(),
});

export type DeployBody = z.infer<typeof DeployBodySchema>;

export const ContainerActionBodySchema = z.object({
  action: z.enum(["start", "stop", "restart", "remove"]),
});

export type ContainerActionBody = z.infer<typeof ContainerActionBodySchema>;

export const LogsQuerySchema = z.object({
  tail: z.coerce.number().int().min(1).max(5000).default(100),
});

export type LogsQuery = z.infer<typeof LogsQuerySchema>;
