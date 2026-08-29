"use client";

import { useState, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type { GitMetadata, ConnectRepoInput } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// State shapes
// ---------------------------------------------------------------------------

interface GitSettingsState {
  data: GitMetadata | null;
  isLoading: boolean;
  error: string | null;
}

interface UseGitSettings {
  state: GitSettingsState;
  fetchMetadata: () => Promise<void>;
  connectRepo: (input: ConnectRepoInput) => Promise<void>;
  generateSshKey: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGitSettings(projectId: string): UseGitSettings {
  const [state, setState] = useState<GitSettingsState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchMetadata = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetchAPI<GitMetadata>(`/api/projects/${projectId}/git`);
      setState({ data, isLoading: false, error: null });
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to load git settings";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, [projectId]);

  const connectRepo = useCallback(
    async (input: ConnectRepoInput) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await fetchAPI<GitMetadata>(`/api/projects/${projectId}/git/connect`, {
          method: "POST",
          body: JSON.stringify(input),
        });
        setState({ data, isLoading: false, error: null });
      } catch (err) {
        const message =
          err instanceof ApiRequestError ? err.message : "Failed to connect repository";
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        // Re-throw so the component can show a toast
        throw err;
      }
    },
    [projectId],
  );

  const generateSshKey = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await fetchAPI<{ publicKey: string }>(
        `/api/projects/${projectId}/git/ssh-key`,
        { method: "POST" },
      );
      setState((prev) => ({
        ...prev,
        isLoading: false,
        data: prev.data
          ? { ...prev.data, sshPublicKey: result.publicKey, isPrivate: true }
          : null,
      }));
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to generate SSH key";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, [projectId]);

  return { state, fetchMetadata, connectRepo, generateSshKey };
}
