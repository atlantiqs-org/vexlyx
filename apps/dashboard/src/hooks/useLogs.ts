"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "./useSocket";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LINES = 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogLine {
  text: string;
  stream: "stdout" | "stderr";
  ts: number;
}

function parseRawLogs(raw: string | null | undefined): LogLine[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((text, i) => ({
      text,
      stream: text.includes("[vexlyx:error]") || text.includes("[error]") ? ("stderr" as const) : ("stdout" as const),
      ts: Date.now() + i,
    }))
    .slice(-MAX_LINES);
}

// ---------------------------------------------------------------------------
// useBuildLogs — real-time build log streaming for a deployment
// ---------------------------------------------------------------------------

/**
 * Subscribes to build log events for a deployment via Socket.io.
 * On join, receives a history replay of up to 1000 lines from the server.
 * New lines are pushed via `log:build` events.
 *
 * @param projectId    - The project ID (used for ownership verification)
 * @param deploymentId - The deployment to subscribe to. Pass null to unsubscribe.
 * @param initialLogs  - Optional raw string logs from deployment record
 */
export function useBuildLogs(
  projectId: string,
  deploymentId: string | null,
  initialLogs?: string | null,
): { lines: LogLine[]; isConnected: boolean } {
  const socket = useSocket();
  const [lines, setLines] = useState<LogLine[]>(() => parseRawLogs(initialLogs));
  const [isConnected, setIsConnected] = useState(() => socket?.connected ?? false);
  const currentDeploymentId = useRef<string | null>(null);

  const appendLine = useCallback((text: string, stream: "stdout" | "stderr" = "stdout", ts = Date.now()) => {
    setLines((prev) => {
      const next = [...prev, { text, stream, ts }];
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  }, []);

  // Update initial logs if provided and lines are empty
  useEffect(() => {
    if (initialLogs && lines.length === 0) {
      setLines(parseRawLogs(initialLogs));
    }
  }, [initialLogs, lines.length]);

  useEffect(() => {
    if (!deploymentId) return;

    if (currentDeploymentId.current !== deploymentId) {
      setLines(parseRawLogs(initialLogs));
      currentDeploymentId.current = deploymentId;
    }

    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("subscribe:build", { deploymentId });
    };

    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = () => setIsConnected(false);

    const handleHistory = ({ lines: historyLines }: { lines: string[] }) => {
      const mapped: LogLine[] = historyLines.map((text, i) => ({
        text,
        stream: text.includes("[vexlyx:error]") || text.includes("[error]") ? ("stderr" as const) : ("stdout" as const),
        ts: Date.now() - (historyLines.length - i) * 10,
      }));
      setLines(mapped.slice(-MAX_LINES));
    };

    const handleBuildLog = ({ line, ts }: { line: string; ts: number }) => {
      appendLine(line, line.includes("[vexlyx:error]") ? "stderr" : "stdout", ts);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("log:history", handleHistory);
    socket.on("log:build", handleBuildLog);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("subscribe:build", { deploymentId });
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("log:history", handleHistory);
      socket.off("log:build", handleBuildLog);
    };
  }, [deploymentId, socket, appendLine, initialLogs]);

  return { lines, isConnected };
}

// ---------------------------------------------------------------------------
// useRuntimeLogs — real-time container log streaming
// ---------------------------------------------------------------------------

/**
 * Subscribes to runtime (container) log events for a project via Socket.io.
 * Starts `docker logs --follow` on the server when enabled.
 * Automatically stops the stream when disabled or on unmount.
 *
 * @param projectId - The project whose container to tail
 * @param enabled   - Whether to start streaming (tied to panel visibility)
 */
export function useRuntimeLogs(
  projectId: string,
  enabled: boolean,
): { lines: LogLine[]; isConnected: boolean; clear: () => void } {
  const socket = useSocket();
  const [lines, setLines] = useState<LogLine[]>([]);
  const [isConnected, setIsConnected] = useState(() => socket?.connected ?? false);

  const appendLine = useCallback((text: string, stream: "stdout" | "stderr", ts: number) => {
    setLines((prev) => {
      const next = [...prev, { text, stream, ts }];
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  useEffect(() => {
    if (!socket) return;

    if (!enabled) {
      socket.emit("unsubscribe:runtime", { projectId });
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("subscribe:runtime", { projectId });
    };

    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = () => setIsConnected(false);

    const handleRuntimeLog = ({
      line,
      stream,
      ts,
    }: {
      line: string;
      stream: "stdout" | "stderr";
      ts: number;
    }) => {
      appendLine(line, stream, ts);
    };

    const handleRuntimeError = ({ message }: { message: string }) => {
      appendLine(`[error] ${message}`, "stderr", Date.now());
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("log:runtime", handleRuntimeLog);
    socket.on("log:runtime:error", handleRuntimeError);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("subscribe:runtime", { projectId });
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("log:runtime", handleRuntimeLog);
      socket.off("log:runtime:error", handleRuntimeError);
      socket.emit("unsubscribe:runtime", { projectId });
    };
  }, [enabled, projectId, socket, appendLine]);

  return { lines, isConnected, clear };
}

