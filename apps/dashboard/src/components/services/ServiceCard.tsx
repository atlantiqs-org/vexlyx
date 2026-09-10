"use client";

import { Play, Square, RotateCw, Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ServiceAction, ServiceStatusResponse } from "@vexlyx/shared";

interface ServiceCardProps {
  label: string;
  status: ServiceStatusResponse;
  isActing: boolean;
  onAction: (action: ServiceAction) => void;
  onViewLogs: () => void;
}

function formatUptime(seconds: number | null): string | null {
  if (seconds === null) return null;
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function StatusBadge({ status }: { status: ServiceStatusResponse["status"] }) {
  switch (status) {
    case "running":
      return (
        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Running
        </Badge>
      );
    case "stopped":
      return (
        <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-xs font-medium text-rose-600 dark:text-rose-400">
          Stopped
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-xs font-medium text-amber-600 dark:text-amber-400">
          Unknown
        </Badge>
      );
  }
}

export function ServiceCard({ label, status, isActing, onAction, onViewLogs }: ServiceCardProps) {
  const isRunning = status.status === "running";
  const uptime = formatUptime(status.uptimeSeconds);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
          {label}
          <StatusBadge status={status.status} />
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 pt-4">
        <div className="text-xs text-muted-foreground">
          {uptime ? `Up ${uptime}` : "Not running"}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRunning ? (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onAction("stop")} disabled={isActing}>
              {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
              Stop
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onAction("start")} disabled={isActing}>
              {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Start
            </Button>
          )}

          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onAction("restart")} disabled={isActing}>
            <RotateCw className={isActing ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            Restart
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={onViewLogs}
          >
            <Terminal className="h-3 w-3" />
            Logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
