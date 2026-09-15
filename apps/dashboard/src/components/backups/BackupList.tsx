"use client";

import { Loader2, Trash2, Eye, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/datetime";
import { useTimezone } from "@/hooks/useSystemSettings";
import type { BackupSnapshotResponse, BackupStatus } from "@vexlyx/shared";

interface BackupListProps {
  snapshots: BackupSnapshotResponse[];
  isLoading: boolean;
  progress: { snapshotId: string; message: string } | null;
  onView: (snapshot: BackupSnapshotResponse) => void;
  onDelete: (id: string) => void;
}

const STATUS_VARIANT: Record<BackupStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  RUNNING: "outline",
  COMPLETED: "default",
  FAILED: "destructive",
};

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function BackupList({ snapshots, isLoading, progress, onView, onDelete }: BackupListProps) {
  const timezone = useTimezone();

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Archive className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No backups yet</p>
        <p className="text-xs text-muted-foreground">
          Run a manual backup or wait for the next scheduled run.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Started</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snapshots.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                {s.status === "RUNNING" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              {s.status === "RUNNING" && progress?.snapshotId === s.id && (
                <p className="mt-1 text-xs text-muted-foreground">{progress.message}</p>
              )}
              {s.status === "FAILED" && s.error && (
                <p className="mt-1 text-xs text-destructive">{s.error}</p>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.trigger}</TableCell>
            <TableCell className="text-sm tabular-nums">{formatBytes(s.sizeBytes)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDateTime(s.startedAt, timezone)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={s.status !== "COMPLETED"}
                  onClick={() => onView(s)}
                  aria-label="View backup contents"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(s.id)}
                  aria-label="Delete backup"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
