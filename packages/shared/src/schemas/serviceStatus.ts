import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const ServiceNameSchema = z.enum(["postfix", "dovecot", "coredns", "postgres", "redis"]);
export type ServiceName = z.infer<typeof ServiceNameSchema>;

export const ServiceRuntimeStatusSchema = z.enum(["running", "stopped", "unknown"]);
export type ServiceRuntimeStatus = z.infer<typeof ServiceRuntimeStatusSchema>;

export const ServiceActionSchema = z.enum(["start", "stop", "restart"]);
export type ServiceAction = z.infer<typeof ServiceActionSchema>;

// ---------------------------------------------------------------------------
// Status — one row per managed service, plus Docker daemon reachability
// ---------------------------------------------------------------------------

export const ServiceStatusSchema = z.object({
  name: ServiceNameSchema,
  containerName: z.string(),
  status: ServiceRuntimeStatusSchema,
  // Populated only while status is "running" — seconds since the container's
  // current run started.
  uptimeSeconds: z.number().nonnegative().nullable(),
});
export type ServiceStatusResponse = z.infer<typeof ServiceStatusSchema>;

export const ServicesStatusSchema = z.object({
  services: z.array(ServiceStatusSchema),
  // Docker daemon itself is not a container and has no start/stop/restart
  // controls here — restarting it would take down every other container,
  // including the panel's own Postgres/Redis.
  dockerDaemon: z.object({
    running: z.boolean(),
  }),
});
export type ServicesStatusResponse = z.infer<typeof ServicesStatusSchema>;

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export const ServiceLogsResponseSchema = z.object({
  logs: z.string(),
});
export type ServiceLogsResponse = z.infer<typeof ServiceLogsResponseSchema>;
