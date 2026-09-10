"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocket } from "./useSocket";
import type { ServicesStatusResponse, ServiceName, ServiceAction } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// API client helpers
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function extractError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

async function fetchServicesStatus(): Promise<ServicesStatusResponse> {
  const res = await fetch(`${API_URL}/api/services`, { credentials: "include" });
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch service status"));
  return res.json() as Promise<ServicesStatusResponse>;
}

async function performServiceAction(name: ServiceName, action: ServiceAction): Promise<void> {
  const res = await fetch(`${API_URL}/api/services/${name}/${action}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await extractError(res, `Failed to ${action} ${name}`));
}

async function fetchServiceLogs(name: ServiceName, tail = 200): Promise<string> {
  const res = await fetch(`${API_URL}/api/services/${name}/logs?tail=${tail}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch logs"));
  const body = (await res.json()) as { logs: string };
  return body.logs;
}

// ---------------------------------------------------------------------------
// useServices — live status via Socket.io + REST fallback
// ---------------------------------------------------------------------------

export function useServices() {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  const query = useQuery({
    queryKey: ["services"],
    queryFn: fetchServicesStatus,
    // Only poll via REST when the socket isn't delivering live pushes
    refetchInterval: isConnected ? false : 15_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("subscribe:services");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleStatus = (data: ServicesStatusResponse) => {
      queryClient.setQueryData(["services"], data);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("services:status", handleStatus);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("subscribe:services");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("services:status", handleStatus);
      socket.emit("unsubscribe:services");
    };
  }, [socket, queryClient]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["services"] });

  const actionMutation = useMutation({
    mutationFn: ({ name, action }: { name: ServiceName; action: ServiceAction }) => performServiceAction(name, action),
    onSuccess: (_data, { name, action }) => {
      toast.success(`${name} ${action}ed`);
      void invalidate();
    },
    onError: (err: Error, { name, action }) => {
      toast.error(`Failed to ${action} ${name}`, { description: err.message });
    },
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    performAction: (name: ServiceName, action: ServiceAction) => actionMutation.mutateAsync({ name, action }),
    isActing: actionMutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// useServiceLogs — on-demand static log tail for a single service
// ---------------------------------------------------------------------------

export function useServiceLogs(name: ServiceName | null) {
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!name) return;
    setIsLoading(true);
    try {
      setLogs(await fetchServiceLogs(name));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch logs";
      toast.error("Failed to fetch logs", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [name]);

  useEffect(() => {
    setLogs("");
    if (name) void refresh();
  }, [name, refresh]);

  return { logs, isLoading, refresh };
}
