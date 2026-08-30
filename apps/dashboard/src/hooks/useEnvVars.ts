"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type { EnvVar, DecryptedEnvVar } from "@vexlyx/shared";

interface UseEnvVarsReturn {
  variables: EnvVar[];
  isLoading: boolean;
  isSaving: boolean;
  refetch: () => Promise<void>;
  upsertVar: (key: string, value: string) => Promise<EnvVar | null>;
  bulkUpsertVars: (
    vars: Array<{ key: string; value: string }>,
  ) => Promise<number | null>;
  importDotEnv: (
    content: string,
    overwrite?: boolean,
  ) => Promise<number | null>;
  deleteVar: (key: string) => Promise<boolean>;
  revealVar: (key: string) => Promise<string | null>;
}

export function useEnvVars(projectId: string): UseEnvVarsReturn {
  const [variables, setVariables] = useState<EnvVar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchVariables = useCallback(async () => {
    try {
      const data = await fetchAPI<{ variables: EnvVar[] }>(
        `/api/projects/${projectId}/env`,
      );
      setVariables(data.variables);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to load environment variables");
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchVariables();
  }, [fetchVariables]);

  const upsertVar = useCallback(
    async (key: string, value: string): Promise<EnvVar | null> => {
      setIsSaving(true);
      try {
        const data = await fetchAPI<EnvVar>(`/api/projects/${projectId}/env`, {
          method: "POST",
          body: JSON.stringify({ key, value }),
        });
        toast.success(`Saved "${key}"`);
        await fetchVariables();
        return data;
      } catch (err) {
        if (err instanceof ApiRequestError) {
          toast.error(err.message);
        } else {
          toast.error(`Failed to save "${key}"`);
        }
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, fetchVariables],
  );

  const bulkUpsertVars = useCallback(
    async (
      vars: Array<{ key: string; value: string }>,
    ): Promise<number | null> => {
      setIsSaving(true);
      try {
        const data = await fetchAPI<{ count: number; variables: EnvVar[] }>(
          `/api/projects/${projectId}/env`,
          {
            method: "POST",
            body: JSON.stringify({ variables: vars }),
          },
        );
        toast.success(`Saved ${data.count} environment variables`);
        setVariables(data.variables);
        return data.count;
      } catch (err) {
        if (err instanceof ApiRequestError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to save environment variables");
        }
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId],
  );

  const importDotEnv = useCallback(
    async (
      content: string,
      overwrite = false,
    ): Promise<number | null> => {
      setIsSaving(true);
      try {
        const data = await fetchAPI<{ count: number; variables: EnvVar[] }>(
          `/api/projects/${projectId}/env/import`,
          {
            method: "POST",
            body: JSON.stringify({ content, overwrite }),
          },
        );
        toast.success(`Successfully imported ${data.count} variables`);
        setVariables(data.variables);
        return data.count;
      } catch (err) {
        if (err instanceof ApiRequestError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to import .env file");
        }
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId],
  );

  const deleteVar = useCallback(
    async (key: string): Promise<boolean> => {
      setIsSaving(true);
      try {
        await fetchAPI(`/api/projects/${projectId}/env/${encodeURIComponent(key)}`, {
          method: "DELETE",
        });
        toast.success(`Deleted "${key}"`);
        setVariables((prev) => prev.filter((v) => v.key !== key));
        return true;
      } catch (err) {
        if (err instanceof ApiRequestError) {
          toast.error(err.message);
        } else {
          toast.error(`Failed to delete "${key}"`);
        }
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId],
  );

  const revealVar = useCallback(
    async (key: string): Promise<string | null> => {
      try {
        const data = await fetchAPI<DecryptedEnvVar>(
          `/api/projects/${projectId}/env/${encodeURIComponent(key)}/reveal`,
        );
        return data.value;
      } catch (err) {
        if (err instanceof ApiRequestError) {
          toast.error(err.message);
        } else {
          toast.error(`Failed to reveal "${key}"`);
        }
        return null;
      }
    },
    [projectId],
  );

  return {
    variables,
    isLoading,
    isSaving,
    refetch: fetchVariables,
    upsertVar,
    bulkUpsertVars,
    importDotEnv,
    deleteVar,
    revealVar,
  };
}
