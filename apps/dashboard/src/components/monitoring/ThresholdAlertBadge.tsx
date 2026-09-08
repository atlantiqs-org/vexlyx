"use client";

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AlertThreshold } from "@vexlyx/shared";

interface ThresholdAlertBadgeProps {
  alerts: AlertThreshold[];
  onDismiss: (type: AlertThreshold["type"]) => void;
  className?: string;
}

const TYPE_LABEL: Record<AlertThreshold["type"], string> = {
  cpu: "CPU",
  ram: "RAM",
  disk: "Disk",
};

/**
 * Animated alert badge — shown when resource thresholds are breached.
 * Renders one compact pill per active alert type (cpu/ram/disk).
 * Includes a dismiss button and a tooltip with full alert message.
 */
export function ThresholdAlertBadge({
  alerts,
  onDismiss,
  className,
}: ThresholdAlertBadgeProps) {
  if (alerts.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {alerts.map((alert) => (
          <Tooltip key={alert.type}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1",
                  "border border-rose-500/20 text-xs font-medium text-rose-600 dark:text-rose-400",
                  "animate-pulse",
                )}
                role="alert"
                aria-label={alert.message}
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{TYPE_LABEL[alert.type]}</span>
                <span className="tabular-nums">{alert.value.toFixed(0)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-0.5 h-4 w-4 rounded-full p-0 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(alert.type);
                  }}
                  aria-label={`Dismiss ${TYPE_LABEL[alert.type]} alert`}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              <p>{alert.message}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
