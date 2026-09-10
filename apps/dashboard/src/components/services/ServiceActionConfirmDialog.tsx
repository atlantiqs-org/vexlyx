"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { ServiceAction } from "@vexlyx/shared";

interface PendingAction {
  label: string;
  action: ServiceAction;
}

interface ServiceActionConfirmDialogProps {
  pending: PendingAction | null;
  isActing: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const ACTION_COPY: Record<
  ServiceAction,
  { title: (label: string) => string; description: (label: string) => string; confirmLabel: string }
> = {
  stop: {
    title: (label) => `Stop ${label}?`,
    description: (label) => `${label} will go offline immediately for every user on this server until it's started again.`,
    confirmLabel: "Stop",
  },
  restart: {
    title: (label) => `Restart ${label}?`,
    description: (label) => `${label} will briefly go offline while it restarts. In-flight connections will be dropped.`,
    confirmLabel: "Restart",
  },
  start: {
    title: (label) => `Start ${label}?`,
    description: (label) => `${label} will be started.`,
    confirmLabel: "Start",
  },
};

export function ServiceActionConfirmDialog({ pending, isActing, onOpenChange, onConfirm }: ServiceActionConfirmDialogProps) {
  const copy = pending ? ACTION_COPY[pending.action] : null;

  return (
    <Dialog open={!!pending} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pending && copy ? copy.title(pending.label) : ""}</DialogTitle>
          <DialogDescription>{pending && copy ? copy.description(pending.label) : ""}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isActing}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isActing}>
            {isActing && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            {copy?.confirmLabel ?? ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
