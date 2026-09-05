"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type {
  SmtpStatusResponse,
  VirtualDomain,
  DkimRecordResponse,
  SendTestEmailInput,
  TestEmailResultResponse,
  MailAuthStatusResponse,
} from "@vexlyx/shared";

export function useMail() {
  const [status, setStatus] = useState<SmtpStatusResponse | null>(null);
  const [domains, setDomains] = useState<VirtualDomain[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchAPI<SmtpStatusResponse>("/api/mail/status");
      setStatus(data);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to load SMTP status";
      setError(msg);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const fetchDomains = useCallback(async () => {
    try {
      const data = await fetchAPI<{ domains: VirtualDomain[] }>("/api/mail/domains");
      setDomains(data.domains ?? []);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to load mail domains";
      setError(msg);
    } finally {
      setIsLoadingDomains(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStatus(), fetchDomains()]);
    setIsRefreshing(false);
  }, [fetchStatus, fetchDomains]);

  useEffect(() => {
    void fetchStatus();
    void fetchDomains();
  }, [fetchStatus, fetchDomains]);

  const syncDomains = async () => {
    const result = await fetchAPI<{
      success: boolean;
      syncedCount: number;
      domains: string[];
      mailboxesSynced: number;
    }>("/api/mail/sync", { method: "POST" });
    await refreshAll();
    return result;
  };

  const generateDkim = async (domainId: string): Promise<DkimRecordResponse> => {
    const result = await fetchAPI<DkimRecordResponse>(`/api/mail/dkim/${domainId}`, {
      method: "POST",
    });
    await fetchDomains();
    return result;
  };

  const regenerateMailAuth = async (domainId: string): Promise<MailAuthStatusResponse> => {
    const result = await fetchAPI<MailAuthStatusResponse>(`/api/mail/auth/${domainId}/regenerate`, {
      method: "POST",
    });
    await fetchDomains();
    return result;
  };

  const sendTestEmail = async (input: SendTestEmailInput): Promise<TestEmailResultResponse> => {
    return await fetchAPI<TestEmailResultResponse>("/api/mail/test-send", {
      method: "POST",
      body: JSON.stringify(input),
    });
  };

  const testOpenRelay = async () => {
    return await fetchAPI<{ safe: boolean; relayDenied: boolean; rcptResponse: string; transcript: string[] }>(
      "/api/mail/test-relay",
    );
  };

  return {
    status,
    domains,
    isLoading: isLoadingStatus || isLoadingDomains,
    isRefreshing,
    error,
    refreshAll,
    syncDomains,
    generateDkim,
    regenerateMailAuth,
    sendTestEmail,
    testOpenRelay,
  };
}
