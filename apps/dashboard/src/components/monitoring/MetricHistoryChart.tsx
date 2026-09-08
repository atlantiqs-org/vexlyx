"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricSnapshot, MetricsRange } from "@vexlyx/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricHistoryChartProps {
  snapshots: MetricSnapshot[];
  range: MetricsRange;
  isLoading?: boolean;
  className?: string;
}

interface ChartDatum {
  time: string;
  cpu: number;
  ram: number;
  disk: number;
}

function formatTime(iso: string, range: MetricsRange): string {
  const date = new Date(iso);
  if (range === "1h" || range === "24h") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function toChartData(snapshots: MetricSnapshot[], range: MetricsRange): ChartDatum[] {
  return snapshots.map((s) => ({
    time: formatTime(s.recordedAt, range),
    cpu: Math.round(s.cpuPercent * 10) / 10,
    ram:
      s.ramTotal > 0
        ? Math.round((s.ramUsed / s.ramTotal) * 1000) / 10
        : 0,
    disk:
      s.diskTotal > 0
        ? Math.round((s.diskUsed / s.diskTotal) * 1000) / 10
        : 0,
  }));
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="capitalize text-foreground">{entry.name}</span>
          <span className="ml-auto tabular-nums font-semibold">
            {entry.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Area chart for historical CPU, RAM, and Disk usage over a chosen time range.
 * Renders using recharts with Vexlyx theme colours and a custom tooltip.
 */
export function MetricHistoryChart({
  snapshots,
  range,
  isLoading = false,
  className,
}: MetricHistoryChartProps) {
  if (isLoading) {
    return <Skeleton className={cn("h-[220px] w-full rounded-lg", className)} />;
  }

  if (snapshots.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[220px] items-center justify-center rounded-lg border border-border bg-card",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">
          No historical data yet — check back in a minute.
        </p>
      </div>
    );
  }

  const data = toChartData(snapshots, range);

  // Downsample to at most 120 points for performance
  const step = Math.max(1, Math.floor(data.length / 120));
  const sampled = data.filter((_, i) => i % step === 0);

  return (
    <div className={cn("h-[220px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sampled} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="cpu"
            name="CPU"
            stroke="#6366f1"
            strokeWidth={1.5}
            fill="url(#cpuGrad)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="ram"
            name="RAM"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#ramGrad)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="disk"
            name="Disk"
            stroke="#f59e0b"
            strokeWidth={1.5}
            fill="url(#diskGrad)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
