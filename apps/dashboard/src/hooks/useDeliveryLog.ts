"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import { useRefreshAnimation } from "@/hooks/useRefreshAnimation";
import type { DeliveryLogResponse } from "@vexlyx/shared";

export type DeliveryLogStatusFilter = "all" | "success" | "deferred" | "bounced";

export function useDeliveryLog() {
  const [log, setLog] = useState<DeliveryLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isRefreshing, refresh: runRefresh } = useRefreshAnimation();

  const [domain, setDomain] = useState("");
  const [mailbox, setMailbox] = useState("");
  const [status, setStatus] = useState<DeliveryLogStatusFilter>("all");

  const fetchLog = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (domain) params.set("domain", domain);
      if (mailbox) params.set("mailbox", mailbox);
      if (status !== "all") params.set("status", status);

      const qs = params.toString();
      const data = await fetchAPI<DeliveryLogResponse>(`/api/mail/logs${qs ? `?${qs}` : ""}`);
      setLog(data);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to load delivery log";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [domain, mailbox, status]);

  const refresh = useCallback(async () => {
    await runRefresh(fetchLog);
  }, [fetchLog, runRefresh]);

  useEffect(() => {
    void fetchLog();
  }, [fetchLog]);

  return {
    log,
    isLoading,
    isRefreshing,
    error,
    refresh,
    domain,
    setDomain,
    mailbox,
    setMailbox,
    status,
    setStatus,
  };
}
