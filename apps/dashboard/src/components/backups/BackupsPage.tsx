"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBackups } from "@/hooks/useBackups";
import { BackupList } from "./BackupList";
import { BackupDetail } from "./BackupDetail";
import { BackupSettingsCard } from "./BackupSettingsCard";
import { TriggerBackupButton } from "./TriggerBackupButton";
import type { BackupSnapshotResponse } from "@vexlyx/shared";

/**
 * Full-system backups page — snapshot list, per-item restore (via
 * BackupDetail's sheet), manual trigger, and schedule/retention settings.
 */
export function BackupsPage() {
  const { snapshots, isLoading, progress, triggerBackup, isTriggering, deleteBackup } = useBackups();
  const [viewing, setViewing] = useState<BackupSnapshotResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleView = (snapshot: BackupSnapshotResponse) => {
    // Always view the freshest copy of this snapshot from the list.
    const fresh = snapshots.find((s) => s.id === snapshot.id) ?? snapshot;
    setViewing(fresh);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backups</h1>
          <p className="text-muted-foreground">
            Full-system snapshots of projects, databases, mail, and DNS.
          </p>
        </div>
        <TriggerBackupButton onTrigger={triggerBackup} isTriggering={isTriggering} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Archive className="h-4 w-4 text-muted-foreground" />
              Snapshots
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BackupList
              snapshots={snapshots}
              isLoading={isLoading}
              progress={progress}
              onView={handleView}
              onDelete={(id) => setDeleteTarget(id)}
            />
          </CardContent>
        </Card>

        <BackupSettingsCard />
      </div>

      <BackupDetail snapshot={viewing} onOpenChange={(open) => !open && setViewing(null)} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this backup?</DialogTitle>
            <DialogDescription>
              The archive and its record will be permanently removed from disk. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTarget) deleteBackup(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
