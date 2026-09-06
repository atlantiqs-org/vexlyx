"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type {
  VacationResponderResponse,
  UpdateVacationResponderInput,
} from "@vexlyx/shared";

export function useVacationResponder(mailboxId: string | null) {
  const [responder, setResponder] = useState<VacationResponderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResponder = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAPI<{ responder: VacationResponderResponse }>(
        `/api/mailboxes/${id}/vacation`,
      );
      setResponder(data.responder);
      return data.responder;
    } catch (err) {
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : "Failed to load vacation responder settings";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mailboxId) {
      void fetchResponder(mailboxId);
    } else {
      setResponder(null);
      setError(null);
    }
  }, [mailboxId, fetchResponder]);

  const updateResponder = async (
    id: string,
    input: UpdateVacationResponderInput,
  ): Promise<VacationResponderResponse> => {
    setIsSaving(true);
    setError(null);
    try {
      const data = await fetchAPI<{ responder: VacationResponderResponse }>(
        `/api/mailboxes/${id}/vacation`,
        {
          method: "PUT",
          body: JSON.stringify(input),
        },
      );
      setResponder(data.responder);
      return data.responder;
    } catch (err) {
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : "Failed to update vacation responder";
      setError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    responder,
    isLoading,
    isSaving,
    error,
    refetch: () => (mailboxId ? fetchResponder(mailboxId) : Promise.resolve(null)),
    updateResponder,
  };
}
