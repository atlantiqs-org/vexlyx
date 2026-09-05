"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type { WebmailStatusResponse } from "@vexlyx/shared";

export function useWebmail() {
  const [status, setStatus] = useState<WebmailStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchAPI<WebmailStatusResponse>("/api/mail/webmail/status");
      setStatus(data);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to load webmail status";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchStatus();
    setIsRefreshing(false);
  }, [fetchStatus]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
