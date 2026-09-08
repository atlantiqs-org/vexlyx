"use client";

import { cn } from "@/lib/utils";

interface ResourceGaugeProps {
  label: string;
  value: number;
  unit?: string;
  /** Colour transition: amber at this threshold */
  warnAt?: number;
  /** Colour transition: rose at this threshold */
  dangerAt?: number;
  className?: string;
}

/**
 * Circular arc gauge for displaying a single percentage metric (CPU, RAM).
 * Pure SVG — no charting library required.
 * Colour shifts amber at warnAt% and rose at dangerAt%.
 */
export function ResourceGauge({
  label,
  value,
  unit = "%",
  warnAt = 70,
  dangerAt = 90,
  className,
}: ResourceGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));

  // Arc geometry — stroke-dasharray trick on a circle
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  // We only draw 270° (three-quarter arc), so scale the offset accordingly
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength - (clamped / 100) * arcLength;

  const colour =
    clamped >= dangerAt
      ? "text-rose-500"
      : clamped >= warnAt
        ? "text-amber-500"
        : "text-emerald-500";

  const trackColour =
    clamped >= dangerAt
      ? "stroke-rose-500/20"
      : clamped >= warnAt
        ? "stroke-amber-500/20"
        : "stroke-emerald-500/20";

  const fillColour =
    clamped >= dangerAt
      ? "stroke-rose-500"
      : clamped >= warnAt
        ? "stroke-amber-500"
        : "stroke-emerald-500";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        className,
      )}
    >
      <div className="relative">
        <svg
          width="112"
          height="112"
          viewBox="0 0 112 112"
          className="-rotate-[135deg]"
          aria-label={`${label}: ${clamped.toFixed(1)}${unit}`}
          role="img"
        >
          {/* Track (background arc) */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn("transition-all duration-300", trackColour)}
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          {/* Fill (value arc) */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn("transition-all duration-700 ease-out", fillColour)}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
          />
        </svg>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-xl font-bold tabular-nums", colour)}>
            {clamped.toFixed(0)}
            <span className="text-sm font-medium">{unit}</span>
          </span>
        </div>
      </div>

      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
