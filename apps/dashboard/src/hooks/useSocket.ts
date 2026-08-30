"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Singleton socket instance — one connection for the entire app lifetime
// ---------------------------------------------------------------------------

let _socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!_socket) {
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    _socket = io(url, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return _socket;
}

/**
 * Returns the singleton Socket.io client.
 * Connects automatically and maintains connection.
 */
export function useSocket(): Socket | null {
  const socket = getSocket();

  useEffect(() => {
    if (socket && !socket.connected) {
      socket.connect();
    }
  }, [socket]);

  return socket;
}

