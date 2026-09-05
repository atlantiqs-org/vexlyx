"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type { AliasResponse, CreateAliasInput } from "@vexlyx/shared";

export function useAliases() {
  const [aliases, setAliases] = useState<AliasResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAliases = useCallback(async () => {
    try {
      const data = await fetchAPI<{ aliases: AliasResponse[] }>("/api/aliases");
      setAliases(data.aliases ?? []);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to load aliases";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAliases();
    setIsRefreshing(false);
  }, [fetchAliases]);

  useEffect(() => {
    void fetchAliases();
  }, [fetchAliases]);

  const createAlias = async (input: CreateAliasInput): Promise<AliasResponse> => {
    const result = await fetchAPI<{ alias: AliasResponse }>("/api/aliases", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await fetchAliases();
    return result.alias;
  };

  const updateAliasDestinations = async (id: string, destinations: string[]): Promise<void> => {
    await fetchAPI(`/api/aliases/${id}/destinations`, {
      method: "PATCH",
      body: JSON.stringify({ destinations }),
    });
    await fetchAliases();
  };

  const deleteAlias = async (id: string): Promise<void> => {
    await fetchAPI(`/api/aliases/${id}`, { method: "DELETE" });
    await fetchAliases();
  };

  return {
    aliases,
    isLoading,
    isRefreshing,
    error,
    refresh,
    createAlias,
    updateAliasDestinations,
    deleteAlias,
  };
}
