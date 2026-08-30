"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  ExternalLink,
  Container,
  Terminal,
  Loader2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LogViewer } from "@/components/projects/LogViewer";
import { useRuntimeLogs } from "@/hooks/useLogs";
import { useContainerAction, useContainerStatus } from "@/hooks/useDeploy";
import type { Project } from "@vexlyx/shared";

interface ContainerControlsProps {
  project: Project;
  onProjectUpdate?: () => void;
}

export function ContainerControls({ project, onProjectUpdate }: ContainerControlsProps) {
  const { executeAction, isExecuting } = useContainerAction(project.id);
  const { status, refetch: refetchStatus } = useContainerStatus(
    project.id,
    Boolean(project.containerId),
  );
  const [showLogs, setShowLogs] = useState(false);

  // Real-time runtime logs via Socket.io
  const { lines: runtimeLines, isConnected: logsConnected, clear: clearLogs } = useRuntimeLogs(
    project.id,
    showLogs,
  );

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const containerStatus = status?.containerStatus ?? project.containerStatus ?? "not_deployed";
  const isRunning = containerStatus === "running";
  const isExited = containerStatus === "exited" || containerStatus === "stopped";
  const hasContainer = Boolean(project.containerId) || isRunning || isExited;

  const handleAction = async (action: "start" | "stop" | "restart" | "remove") => {
    try {
      await executeAction(action);
      toast.success(`Container ${action} succeeded`);
      await refetchStatus();
      if (onProjectUpdate) onProjectUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(`Failed to ${action} container: ${msg}`);
    } finally {
      if (action === "remove") setRemoveDialogOpen(false);
    }
  };

  const statusBadge = () => {
    switch (containerStatus) {
      case "running":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium"
          >
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Running
          </Badge>
        );
      case "exited":
      case "stopped":
        return (
          <Badge
            variant="outline"
            className="border-slate-500/20 bg-slate-500/10 text-slate-500 text-xs font-medium"
          >
            Stopped
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium"
          >
            Not Deployed
          </Badge>
        );
    }
  };

  return (
    <Card className="border border-border" id="container-controls">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Container className="h-3.5 w-3.5" />
              Live Container
            </span>
            {statusBadge()}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {hasContainer && (
              <>
                {isRunning ? (
                  <Button
                    id="container-stop-btn"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => void handleAction("stop")}
                    disabled={isExecuting}
                  >
                    {isExecuting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Square className="h-3 w-3" />
                    )}
                    Stop
                  </Button>
                ) : (
                  <Button
                    id="container-start-btn"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => void handleAction("start")}
                    disabled={isExecuting}
                  >
                    {isExecuting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Start
                  </Button>
                )}

                <Button
                  id="container-restart-btn"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => void handleAction("restart")}
                  disabled={isExecuting}
                >
                  <RotateCw className={cn("h-3 w-3", isExecuting && "animate-spin")} />
                  Restart
                </Button>

                <Button
                  id="container-remove-btn"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setRemoveDialogOpen(true)}
                  disabled={isExecuting}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </Button>
              </>
            )}

            <Button
              id="toggle-runtime-logs-btn"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowLogs((v) => !v)}
            >
              <Terminal className="h-3 w-3" />
              {showLogs ? "Hide Logs" : "Runtime Logs"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-4">
        {/* Container info summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground">Endpoint / Domain</span>
            <div className="mt-1 flex items-center gap-1.5">
              {project.deployedDomain ? (
                <a
                  href={`http://${project.deployedDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                >
                  {project.deployedDomain}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground">Host Port</span>
            <div className="mt-1 flex items-center gap-1.5">
              {project.internalPort ? (
                <a
                  href={`http://localhost:${project.internalPort}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  :{project.internalPort}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground font-mono">Not allocated</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground">Container ID</span>
            <div className="mt-1 font-mono text-xs text-muted-foreground truncate">
              {project.containerId ? project.containerId.slice(0, 12) : "None"}
            </div>
          </div>
        </div>

        {/* Runtime logs panel */}
        {showLogs && (
          <LogViewer
            lines={runtimeLines}
            title="Container Runtime Logs"
            isLive
            isConnected={logsConnected}
            maxHeightClass="max-h-72"
            className="mt-4"
            onClear={clearLogs}
          />
        )}
      </CardContent>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove container for &ldquo;{project.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This will stop the running container and remove associated volumes. Your source code
              and deployment history will remain intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
              disabled={isExecuting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleAction("remove")}
              disabled={isExecuting}
            >
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Container
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
