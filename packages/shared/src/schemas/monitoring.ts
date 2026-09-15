import { z } from "zod";

// ---------------------------------------------------------------------------
// Server-level metrics (one snapshot per collection interval)
// ---------------------------------------------------------------------------

export const ServerMetricsSchema = z.object({
  cpuPercent: z.number().min(0).max(100),
  cpuPerCore: z.array(z.number().min(0).max(100)),
  cpuCoreCount: z.number().int().positive(),
  ramUsed: z.number().int().nonnegative(),
  ramTotal: z.number().int().positive(),
  ramPercent: z.number().min(0).max(100),
  diskUsed: z.number().int().nonnegative(),
  diskTotal: z.number().int().positive(),
  diskPercent: z.number().min(0).max(100),
  uptimeSeconds: z.number().nonnegative(),
  loadAvg1: z.number().nonnegative(),
  loadAvg5: z.number().nonnegative(),
  loadAvg15: z.number().nonnegative(),
  netRxBytes: z.number().int().nonnegative(),
  netTxBytes: z.number().int().nonnegative(),
});

export type ServerMetrics = z.infer<typeof ServerMetricsSchema>;

// ---------------------------------------------------------------------------
// Per-container metrics
// ---------------------------------------------------------------------------

export const ContainerMetricSchema = z.object({
  containerId: z.string(),
  name: z.string(),
  projectId: z.string().optional(),
  cpuPercent: z.number().min(0),
  memUsed: z.number().int().nonnegative(),
  memLimit: z.number().int().nonnegative(),
  memPercent: z.number().min(0).max(100),
  netRx: z.number().int().nonnegative(),
  netTx: z.number().int().nonnegative(),
  blockRead: z.number().int().nonnegative(),
  blockWrite: z.number().int().nonnegative(),
  status: z.string(),
});

export type ContainerMetric = z.infer<typeof ContainerMetricSchema>;

// ---------------------------------------------------------------------------
// Historical snapshot (row shape returned from MetricSnapshot DB table)
// ---------------------------------------------------------------------------

export const MetricSnapshotSchema = z.object({
  id: z.string(),
  cpuPercent: z.number(),
  ramUsed: z.number(),
  ramTotal: z.number(),
  diskUsed: z.number(),
  diskTotal: z.number(),
  recordedAt: z.string().datetime(),
});

export type MetricSnapshot = z.infer<typeof MetricSnapshotSchema>;

// ---------------------------------------------------------------------------
// Alert threshold event
// ---------------------------------------------------------------------------

export const AlertThresholdSchema = z.object({
  type: z.enum(["cpu", "ram", "disk"]),
  value: z.number(),
  threshold: z.number(),
  message: z.string(),
  triggeredAt: z.string().datetime(),
});

export type AlertThreshold = z.infer<typeof AlertThresholdSchema>;

// ---------------------------------------------------------------------------
// API query params
// ---------------------------------------------------------------------------

export const MetricsRangeSchema = z.enum(["1h", "24h", "7d", "30d"]);

export const MetricsQuerySchema = z.object({
  range: MetricsRangeSchema.default("24h"),
});

export type MetricsRange = z.infer<typeof MetricsRangeSchema>;
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

// ---------------------------------------------------------------------------
// Threshold config (used by collector + API)
// ---------------------------------------------------------------------------

export const ThresholdConfigSchema = z.object({
  cpuThreshold: z.number().min(0).max(100).default(80),
  ramThreshold: z.number().min(0).max(100).default(85),
  diskThreshold: z.number().min(0).max(100).default(90),
});

export type ThresholdConfig = z.infer<typeof ThresholdConfigSchema>;
