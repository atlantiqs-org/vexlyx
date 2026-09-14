"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import { useRefreshAnimation } from "@/hooks/useRefreshAnimation";
import type { WebmailStatusResponse, WebmailActivityResponse } from "@vexlyx/shared";

export function useWebmail() {
  const [status, setStatus] = useState<WebmailStatusResponse | null>(null);
  const [activity, setActivity] = useState<WebmailActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isRefreshing, refresh: runRefresh } = useRefreshAnimation();
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

  const fetchActivity = useCallback(async () => {
    try {
      const data = await fetchAPI<WebmailActivityResponse>("/api/mail/webmail/activity");
      setActivity(data);
    } catch {
      // Non-fatal — the status card above still renders; activity is additive.
    }
  }, []);

  const refresh = useCallback(async () => {
    await runRefresh(() => Promise.all([fetchStatus(), fetchActivity()]));
  }, [fetchStatus, fetchActivity, runRefresh]);

  useEffect(() => {
    void fetchStatus();
    void fetchActivity();
  }, [fetchStatus, fetchActivity]);

  return {
    status,
    activity,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
