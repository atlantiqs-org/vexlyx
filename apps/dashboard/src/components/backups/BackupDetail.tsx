"use client";

import { useState } from "react";
import { FolderKanban, Database, Mail, Globe, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRestoreItem } from "@/hooks/useBackups";
import { useTimezone } from "@/hooks/useSystemSettings";
import { formatDateTime } from "@/lib/datetime";
import { RestoreConfirmDialog } from "./RestoreConfirmDialog";
import type { BackupSnapshotResponse, BackupItemType } from "@vexlyx/shared";

interface BackupDetailProps {
  snapshot: BackupSnapshotResponse | null;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface RestoreTarget {
  itemType: BackupItemType;
  itemId: string;
  label: string;
}

/**
 * Detail sheet for a completed snapshot — lists everything the manifest
 * contains, each with a "Restore" action for per-item restore.
 */
export function BackupDetail({ snapshot, onOpenChange }: BackupDetailProps) {
  const [restoreTarget, setRestoreTarget] = useState<RestoreTarget | null>(null);
  const { restore, isRestoring, progress } = useRestoreItem(snapshot?.id ?? "");
  const timezone = useTimezone();

  const manifest = snapshot?.manifest;

  const handleConfirm = () => {
    if (!restoreTarget) return;
    restore(restoreTarget.itemType, restoreTarget.itemId);
  };

  return (
    <>
      <Sheet open={!!snapshot} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Backup Contents</SheetTitle>
            <SheetDescription>
              {snapshot ? formatDateTime(snapshot.createdAt, timezone) : ""}
            </SheetDescription>
          </SheetHeader>

          {!manifest ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              This snapshot has no contents to browse.
            </div>
          ) : (
            <div className="space-y-6 px-4 pb-6">
              <ManifestSection
                icon={FolderKanban}
                title="Projects"
                items={manifest.projects.map((p) => ({
                  id: p.id,
                  label: p.name,
                  sub: formatBytes(p.sizeBytes),
                }))}
                onRestore={(id, label) => setRestoreTarget({ itemType: "project", itemId: id, label })}
              />

              <Separator />

              <ManifestSection
                icon={Database}
                title="Databases"
                items={manifest.databases.map((d) => ({
                  id: d.id,
                  label: d.name,
                  sub: `${d.type} · ${formatBytes(d.sizeBytes)}`,
                }))}
                onRestore={(id, label) => setRestoreTarget({ itemType: "database", itemId: id, label })}
              />

              <Separator />

              <ManifestSection
                icon={Mail}
                title="Mail Domains"
                items={manifest.mail.map((m) => ({
                  id: m.domainId,
                  label: m.hostname,
                  sub: formatBytes(m.sizeBytes),
                }))}
                onRestore={(id, label) => setRestoreTarget({ itemType: "mail", itemId: id, label })}
              />

              <Separator />

              <ManifestSection
                icon={Globe}
                title="DNS Zones"
                items={manifest.dns.map((d) => ({
                  id: d.domainId,
                  label: d.hostname,
                  sub: `${d.records.length} record${d.records.length === 1 ? "" : "s"}`,
                }))}
                onRestore={(id, label) => setRestoreTarget({ itemType: "dns", itemId: id, label })}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <RestoreConfirmDialog
        target={restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        onConfirm={handleConfirm}
        isRestoring={isRestoring}
        progress={progress}
      />
    </>
  );
}

function ManifestSection({
  icon: Icon,
  title,
  items,
  onRestore,
}: {
  icon: typeof FolderKanban;
  title: string;
  items: { id: string; label: string; sub: string }[];
  onRestore: (id: string, label: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
          {items.length}
        </span>
      </h3>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing captured in this snapshot.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1.5 text-xs"
                onClick={() => onRestore(item.id, item.label)}
              >
                <RotateCcw className="h-3 w-3" />
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
