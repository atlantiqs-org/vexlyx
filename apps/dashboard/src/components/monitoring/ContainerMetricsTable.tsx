"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ContainerMetric } from "@vexlyx/shared";
import { formatBytes } from "./UsageBar";

interface ContainerMetricsTableProps {
  containers: ContainerMetric[];
  isLoading?: boolean;
  className?: string;
}

function CpuBadge({ percent }: { percent: number }) {
  const variant =
    percent >= 90
      ? "destructive"
      : percent >= 70
        ? "outline"
        : "secondary";
  const colour =
    percent >= 90
      ? ""
      : percent >= 70
        ? "border-amber-500 text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Badge variant={variant} className={cn("tabular-nums font-mono text-xs", colour)}>
      {percent.toFixed(1)}%
    </Badge>
  );
}

/**
 * Table of per-container CPU, RAM, and network I/O metrics.
 * Uses shadcn Table and Badge — consistent with existing project data tables.
 */
export function ContainerMetricsTable({
  containers,
  isLoading = false,
  className,
}: ContainerMetricsTableProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card py-10 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">
          No running containers detected.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Container</TableHead>
            <TableHead className="w-[100px]">CPU</TableHead>
            <TableHead className="w-[140px]">RAM</TableHead>
            <TableHead className="w-[80px] text-right">RAM %</TableHead>
            <TableHead className="w-[130px] text-right">Net In / Out</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {containers.map((c) => (
            <TableRow key={c.containerId || c.name}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.containerId.slice(0, 12)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <CpuBadge percent={c.cpuPercent} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums">
                {formatBytes(c.memUsed)} / {formatBytes(c.memLimit)}
              </TableCell>
              <TableCell className="text-right text-xs tabular-nums">
                {c.memPercent.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                ↓ {formatBytes(c.netRx)} / ↑ {formatBytes(c.netTx)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
