"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import { useRefreshAnimation } from "@/hooks/useRefreshAnimation";
import type { QueueListResponse, QueueActionResult } from "@vexlyx/shared";

export function useQueue() {
  const [queue, setQueue] = useState<QueueListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isRefreshing, refresh: runRefresh } = useRefreshAnimation();

  const fetchQueue = useCallback(async () => {
    try {
      const data = await fetchAPI<QueueListResponse>("/api/mail/queue");
      setQueue(data);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to load mail queue";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await runRefresh(fetchQueue);
  }, [fetchQueue, runRefresh]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const deleteMessage = async (queueId: string): Promise<QueueActionResult> => {
    const result = await fetchAPI<QueueActionResult>(`/api/mail/queue/${queueId}/delete`, {
      method: "POST",
    });
    await fetchQueue();
    return result;
  };

  const flushAll = async (): Promise<QueueActionResult> => {
    const result = await fetchAPI<QueueActionResult>("/api/mail/queue/flush", { method: "POST" });
    await fetchQueue();
    return result;
  };

  const flushMessage = async (queueId: string): Promise<QueueActionResult> => {
    const result = await fetchAPI<QueueActionResult>(`/api/mail/queue/${queueId}/flush`, {
      method: "POST",
    });
    await fetchQueue();
    return result;
  };

  const holdMessage = async (queueId: string): Promise<QueueActionResult> => {
    const result = await fetchAPI<QueueActionResult>(`/api/mail/queue/${queueId}/hold`, {
      method: "POST",
    });
    await fetchQueue();
    return result;
  };

  const releaseMessage = async (queueId: string): Promise<QueueActionResult> => {
    const result = await fetchAPI<QueueActionResult>(`/api/mail/queue/${queueId}/release`, {
      method: "POST",
    });
    await fetchQueue();
    return result;
  };

  return {
    queue,
    isLoading,
    isRefreshing,
    error,
    refresh,
    deleteMessage,
    flushAll,
    flushMessage,
    holdMessage,
    releaseMessage,
  };
}
