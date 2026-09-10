"use client";

import { RefreshCw, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useServiceLogs } from "@/hooks/useServices";
import type { ServiceName } from "@vexlyx/shared";

interface ServiceLogsDialogProps {
  service: { name: ServiceName; label: string } | null;
  onOpenChange: (open: boolean) => void;
}

export function ServiceLogsDialog({ service, onOpenChange }: ServiceLogsDialogProps) {
  const { logs, isLoading, refresh } = useServiceLogs(service?.name ?? null);

  return (
    <Dialog open={!!service} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              {service ? `${service.label} logs` : "Logs"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              aria-label="Refresh logs"
              title="Refresh logs"
              onClick={() => void refresh()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3 w-3 transition-transform duration-500", isLoading && "animate-spin text-indigo-500")} />
            </Button>
          </DialogTitle>
          <DialogDescription>Most recent 200 lines.</DialogDescription>
        </DialogHeader>

        <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300">
          {logs || (isLoading ? "Loading…" : "No log output.")}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
