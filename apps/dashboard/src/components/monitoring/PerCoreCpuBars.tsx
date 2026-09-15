"use client";

import { cn } from "@/lib/utils";

interface PerCoreCpuBarsProps {
  cores: number[];
  className?: string;
}

function barColour(pct: number): string {
  if (pct >= 90) return "bg-rose-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

/**
 * Compact per-core CPU breakdown (F5.13) — a small vertical bar per core,
 * shown alongside the aggregate CPU gauge rather than replacing it.
 */
export function PerCoreCpuBars({ cores, className }: PerCoreCpuBarsProps) {
  if (cores.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs font-medium text-muted-foreground">
        Per Core <span className="tabular-nums">({cores.length})</span>
      </p>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
        {cores.map((pct, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1"
            title={`Core ${i}: ${pct.toFixed(1)}%`}
          >
            <div className="h-12 w-full overflow-hidden rounded-sm bg-muted">
              <div
                className={cn("w-full rounded-sm transition-all duration-700 ease-out", barColour(pct))}
                style={{ height: `${Math.max(2, pct)}%`, marginTop: `${100 - Math.max(2, pct)}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Core ${i}`}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">{i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
