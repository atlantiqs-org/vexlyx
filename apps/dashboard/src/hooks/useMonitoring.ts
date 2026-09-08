"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocket } from "./useSocket";
import type {
  ServerMetrics,
  ContainerMetric,
  MetricSnapshot,
  AlertThreshold,
  MetricsRange,
} from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// API client helpers
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function fetchServerMetrics(): Promise<ServerMetrics> {
  const res = await fetch(`${API_URL}/api/monitoring/server`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch server metrics");
  return res.json() as Promise<ServerMetrics>;
}

async function fetchContainerMetrics(): Promise<{ containers: ContainerMetric[] }> {
  const res = await fetch(`${API_URL}/api/monitoring/containers`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch container metrics");
  return res.json() as Promise<{ containers: ContainerMetric[] }>;
}

async function fetchMetricHistory(
  range: MetricsRange,
): Promise<{ snapshots: MetricSnapshot[]; range: MetricsRange }> {
  const res = await fetch(`${API_URL}/api/monitoring/history?range=${range}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch metric history");
  return res.json() as Promise<{ snapshots: MetricSnapshot[]; range: MetricsRange }>;
}

// ---------------------------------------------------------------------------
// useServerMetrics — live server metrics via Socket.io + REST fallback
// ---------------------------------------------------------------------------

export function useServerMetrics() {
  const socket = useSocket();
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // REST fallback query — only active when Socket not connected
  const { data: restData } = useQuery({
    queryKey: ["monitoring", "server-rest"],
    queryFn: fetchServerMetrics,
    // Only poll via REST when socket is not connected
    enabled: !isConnected,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  // If REST data arrives and socket isn't live, use it
  useEffect(() => {
    if (!isConnected && restData) {
      setMetrics(restData);
    }
  }, [restData, isConnected]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("subscribe:metrics");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleMetrics = (data: ServerMetrics) => {
      setMetrics(data);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("metrics:server", handleMetrics);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("subscribe:metrics");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("metrics:server", handleMetrics);
      socket.emit("unsubscribe:metrics");
    };
  }, [socket]);

  return { metrics, isConnected };
}

// ---------------------------------------------------------------------------
// useContainerMetrics — live per-container metrics via Socket.io
// ---------------------------------------------------------------------------

export function useContainerMetrics() {
  const socket = useSocket();
  const [containers, setContainers] = useState<ContainerMetric[]>([]);

  // REST fallback
  const { data: restData } = useQuery({
    queryKey: ["monitoring", "containers-rest"],
    queryFn: fetchContainerMetrics,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (restData) {
      setContainers(restData.containers);
    }
  }, [restData]);

  useEffect(() => {
    if (!socket) return;

    const handleContainers = (data: ContainerMetric[]) => {
      setContainers(data);
    };

    socket.on("metrics:containers", handleContainers);

    return () => {
      socket.off("metrics:containers", handleContainers);
    };
  }, [socket]);

  return { containers };
}

// ---------------------------------------------------------------------------
// useMetricHistory — historical snapshots via TanStack Query
// ---------------------------------------------------------------------------

export function useMetricHistory(range: MetricsRange) {
  return useQuery({
    queryKey: ["monitoring", "history", range],
    queryFn: () => fetchMetricHistory(range),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// useThresholdAlerts — listens for alert:threshold Socket.io events
// Shows sonner toast notifications and tracks active alerts
// ---------------------------------------------------------------------------

export function useThresholdAlerts() {
  const socket = useSocket();
  const [activeAlerts, setActiveAlerts] = useState<AlertThreshold[]>([]);
  const alertTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastToastTimeRef = useRef<Map<string, number>>(new Map());

  const dismissAlert = useCallback((type: AlertThreshold["type"]) => {
    setActiveAlerts((prev) => prev.filter((a) => a.type !== type));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleAlert = (alert: AlertThreshold) => {
      // Debounce sonner toast so it doesn't pop up continuously (at most once every 60s)
      const now = Date.now();
      const lastShown = lastToastTimeRef.current.get(alert.type) ?? 0;
      if (now - lastShown >= 60_000) {
        lastToastTimeRef.current.set(alert.type, now);
        toast.warning(alert.message, {
          description: `Threshold: ${alert.threshold}% | Current: ${alert.value.toFixed(1)}%`,
          duration: 8_000,
          id: `alert-${alert.type}`, // deduplicate same-type alerts
        });
      }

      // Track in active alerts state (for sidebar badge)
      setActiveAlerts((prev) => {
        const filtered = prev.filter((a) => a.type !== alert.type);
        return [...filtered, alert];
      });

      // Auto-dismiss alert badge after 5 minutes if not re-triggered
      const existing = alertTimeouts.current.get(alert.type);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        dismissAlert(alert.type);
        alertTimeouts.current.delete(alert.type);
      }, 5 * 60_000);
      alertTimeouts.current.set(alert.type, timeout);
    };

    socket.on("alert:threshold", handleAlert);

    return () => {
      socket.off("alert:threshold", handleAlert);
      for (const timeout of alertTimeouts.current.values()) {
        clearTimeout(timeout);
      }
    };
  }, [socket, dismissAlert]);

  return { activeAlerts, dismissAlert };
}
