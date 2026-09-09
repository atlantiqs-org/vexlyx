"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BackupItemType } from "@vexlyx/shared";

interface RestoreTarget {
  itemType: BackupItemType;
  itemId: string;
  label: string;
}

interface RestoreConfirmDialogProps {
  target: RestoreTarget | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isRestoring: boolean;
  progress: string | null;
}

const ITEM_TYPE_LABEL: Record<BackupItemType, string> = {
  project: "project",
  database: "database",
  mail: "mail domain",
  dns: "DNS zone",
};

/**
 * Destructive confirmation for per-item restore. Restoring overwrites the
 * live target in place (stops/replaces/restarts a project container, drops
 * and reloads a database, replaces a mail domain's Maildir, or replaces a
 * domain's DNS records) — there is no undo.
 */
export function RestoreConfirmDialog({
  target,
  onOpenChange,
  onConfirm,
  isRestoring,
  progress,
}: RestoreConfirmDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !isRestoring && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore {target ? ITEM_TYPE_LABEL[target.itemType] : ""}?</DialogTitle>
          <DialogDescription>
            This will overwrite &ldquo;{target?.label}&rdquo; with its state from this backup.
            The current data will be permanently replaced and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {progress && (
          <p className="text-sm text-muted-foreground" role="status">
            {progress}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isRestoring}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isRestoring}>
            {isRestoring && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Restore &amp; Overwrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
