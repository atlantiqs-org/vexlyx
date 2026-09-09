"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocket } from "./useSocket";
import type {
  BackupSnapshotResponse,
  BackupSettingsResponse,
  UpdateBackupSettingsInput,
  BackupItemType,
} from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// API client helpers
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function fetchBackups(): Promise<{ snapshots: BackupSnapshotResponse[] }> {
  const res = await fetch(`${API_URL}/api/backups`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch backups");
  return res.json() as Promise<{ snapshots: BackupSnapshotResponse[] }>;
}

async function fetchBackupSettings(): Promise<BackupSettingsResponse> {
  const res = await fetch(`${API_URL}/api/backups/settings`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch backup settings");
  return res.json() as Promise<BackupSettingsResponse>;
}

async function triggerBackup(): Promise<void> {
  const res = await fetch(`${API_URL}/api/backups`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error("Failed to trigger backup");
}

async function deleteBackup(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/backups/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Failed to delete backup");
}

async function restoreBackupItem(id: string, itemType: BackupItemType, itemId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/backups/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemType, itemId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to restore item");
  }
}

async function updateBackupSettings(input: UpdateBackupSettingsInput): Promise<BackupSettingsResponse> {
  const res = await fetch(`${API_URL}/api/backups/settings`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to update backup settings");
  return res.json() as Promise<BackupSettingsResponse>;
}

// ---------------------------------------------------------------------------
// useBackups — snapshot list, live progress via Socket.io
// ---------------------------------------------------------------------------

export function useBackups() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{ snapshotId: string; message: string } | null>(null);

  const query = useQuery({
    queryKey: ["backups"],
    queryFn: fetchBackups,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => socket.emit("subscribe:backups");

    const handleProgress = (data: { snapshotId: string; message: string }) => {
      setProgress(data);
    };

    const handleCompleted = (data: { snapshotId: string; status: string; error?: string }) => {
      setProgress(null);
      void queryClient.invalidateQueries({ queryKey: ["backups"] });
      if (data.status === "COMPLETED") {
        toast.success("Backup completed");
      } else if (data.status === "FAILED") {
        toast.error("Backup failed", { description: data.error });
      }
    };

    socket.on("connect", handleConnect);
    socket.on("backup:progress", handleProgress);
    socket.on("backup:completed", handleCompleted);

    if (socket.connected) socket.emit("subscribe:backups");

    return () => {
      socket.off("connect", handleConnect);
      socket.off("backup:progress", handleProgress);
      socket.off("backup:completed", handleCompleted);
      socket.emit("unsubscribe:backups");
    };
  }, [socket, queryClient]);

  const triggerMutation = useMutation({
    mutationFn: triggerBackup,
    onSuccess: () => {
      toast.success("Backup started");
      void queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: () => toast.error("Failed to start backup"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBackup,
    onSuccess: () => {
      toast.success("Backup deleted");
      void queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: () => toast.error("Failed to delete backup"),
  });

  return {
    snapshots: query.data?.snapshots ?? [],
    isLoading: query.isLoading,
    progress,
    triggerBackup: () => triggerMutation.mutate(),
    isTriggering: triggerMutation.isPending,
    deleteBackup: (id: string) => deleteMutation.mutate(id),
  };
}

// ---------------------------------------------------------------------------
// useRestoreItem — restore a single item from a snapshot, with live progress
// ---------------------------------------------------------------------------

export function useRestoreItem(snapshotId: string) {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data: { snapshotId: string; message: string }) => {
      if (data.snapshotId === snapshotId) setProgress(data.message);
    };

    socket.on("restore:progress", handleProgress);
    return () => {
      socket.off("restore:progress", handleProgress);
    };
  }, [socket, snapshotId]);

  const mutation = useMutation({
    mutationFn: ({ itemType, itemId }: { itemType: BackupItemType; itemId: string }) =>
      restoreBackupItem(snapshotId, itemType, itemId),
    onSuccess: () => {
      toast.success("Restore completed");
      setProgress(null);
      void queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (err: Error) => {
      toast.error("Restore failed", { description: err.message });
      setProgress(null);
    },
  });

  return {
    restore: (itemType: BackupItemType, itemId: string) => mutation.mutate({ itemType, itemId }),
    isRestoring: mutation.isPending,
    progress,
  };
}

// ---------------------------------------------------------------------------
// useBackupSettings — schedule + retention config
// ---------------------------------------------------------------------------

export function useBackupSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["backups", "settings"],
    queryFn: fetchBackupSettings,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: updateBackupSettings,
    onSuccess: () => {
      toast.success("Backup settings updated");
      void queryClient.invalidateQueries({ queryKey: ["backups", "settings"] });
    },
    onError: () => toast.error("Failed to update backup settings"),
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: (input: UpdateBackupSettingsInput) => mutation.mutate(input),
    isSaving: mutation.isPending,
  };
}
