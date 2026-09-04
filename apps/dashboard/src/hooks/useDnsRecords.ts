"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type {
  DnsRecordResponse,
  CreateDnsRecordInput,
  UpdateDnsRecordInput,
  DnsPropagationResponse,
} from "@vexlyx/shared";

interface UseDnsRecordsOptions {
  domainId?: string;
  autoFetch?: boolean;
}

export function useDnsRecords({ domainId, autoFetch = true }: UseDnsRecordsOptions = {}) {
  const [records, setRecords] = useState<DnsRecordResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(
    async (quiet = false) => {
      if (!domainId) {
        setRecords([]);
        return;
      }

      if (!quiet) setIsLoading(true);
      setError(null);

      try {
        const data = await fetchAPI<DnsRecordResponse[]>(`/api/domains/${domainId}/dns`);
        setRecords(data ?? []);
      } catch (err) {
        const message =
          err instanceof ApiRequestError ? err.message : "Failed to load DNS records";
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [domainId],
  );

  useEffect(() => {
    if (autoFetch && domainId) {
      void fetchRecords();
    }
  }, [autoFetch, domainId, fetchRecords]);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchRecords(true);
  };

  const createRecord = async (input: CreateDnsRecordInput): Promise<DnsRecordResponse> => {
    if (!domainId) throw new Error("No domain selected");

    const created = await fetchAPI<DnsRecordResponse>(`/api/domains/${domainId}/dns`, {
      method: "POST",
      body: JSON.stringify(input),
    });

    setRecords((prev) => [...prev, created]);
    return created;
  };

  const updateRecord = async (
    recordId: string,
    input: UpdateDnsRecordInput,
  ): Promise<DnsRecordResponse> => {
    if (!domainId) throw new Error("No domain selected");

    const updated = await fetchAPI<DnsRecordResponse>(`/api/domains/${domainId}/dns/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });

    setRecords((prev) => prev.map((r) => (r.id === recordId ? updated : r)));
    return updated;
  };

  const deleteRecord = async (recordId: string): Promise<void> => {
    if (!domainId) throw new Error("No domain selected");

    await fetchAPI(`/api/domains/${domainId}/dns/${recordId}`, {
      method: "DELETE",
    });

    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  };

  const initializeDefaults = async (): Promise<DnsRecordResponse[]> => {
    if (!domainId) throw new Error("No domain selected");

    setIsRefreshing(true);
    try {
      const data = await fetchAPI<DnsRecordResponse[]>(`/api/domains/${domainId}/dns/defaults`, {
        method: "POST",
      });
      setRecords(data ?? []);
      return data ?? [];
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportZone = async (): Promise<string> => {
    if (!domainId) throw new Error("No domain selected");

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${API_BASE_URL}/api/domains/${domainId}/dns/export`, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Failed to export zone file");
    }

    return await res.text();
  };

  const importZone = async (
    zoneContent: string,
    strategy: "skip" | "replace" = "skip",
  ): Promise<{ importedCount: number; records: DnsRecordResponse[]; errors: string[] }> => {
    if (!domainId) throw new Error("No domain selected");

    const result = await fetchAPI<{
      importedCount: number;
      records: DnsRecordResponse[];
      errors: string[];
    }>(`/api/domains/${domainId}/dns/import`, {
      method: "POST",
      body: JSON.stringify({ zoneContent, strategy }),
    });

    setRecords(result.records ?? []);
    return result;
  };

  const checkPropagation = async (recordId: string): Promise<DnsPropagationResponse> => {
    if (!domainId) throw new Error("No domain selected");

    return await fetchAPI<DnsPropagationResponse>(
      `/api/domains/${domainId}/dns/${recordId}/propagation`,
      {
        method: "POST",
      },
    );
  };

  return {
    records,
    isLoading,
    isRefreshing,
    error,
    refetch: () => fetchRecords(),
    refresh,
    createRecord,
    updateRecord,
    deleteRecord,
    initializeDefaults,
    exportZone,
    importZone,
    checkPropagation,
  };
}
