"use client";

import { Container } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DockerDaemonCardProps {
  running: boolean | undefined;
}

/**
 * Docker daemon is not a container — start/stop/restart is intentionally
 * unavailable here since restarting it would take down every other
 * container this panel manages, including its own Postgres/Redis.
 */
export function DockerDaemonCard({ running }: DockerDaemonCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
          <span className="flex items-center gap-2">
            <Container className="h-4 w-4 text-muted-foreground" />
            Docker Daemon
          </span>
          {running === undefined ? (
            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-xs font-medium text-amber-600 dark:text-amber-400">
              Unknown
            </Badge>
          ) : running ? (
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Running
            </Badge>
          ) : (
            <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-xs font-medium text-rose-600 dark:text-rose-400">
              Stopped
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Host process, not a container — no start/stop/restart controls here.
        </p>
      </CardContent>
    </Card>
  );
}
