"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SystemSettingsResponse } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// API client helpers
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function fetchSystemSettings(): Promise<SystemSettingsResponse> {
  const res = await fetch(`${API_URL}/api/system/settings`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch system settings");
  return res.json() as Promise<SystemSettingsResponse>;
}

async function updateSystemSettings(timezone: string): Promise<SystemSettingsResponse> {
  const res = await fetch(`${API_URL}/api/system/settings`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timezone }),
  });
  if (!res.ok) throw new Error("Failed to update system settings");
  return res.json() as Promise<SystemSettingsResponse>;
}

// ---------------------------------------------------------------------------
// useSystemSettings — server timezone, shared by every timestamp display
// ---------------------------------------------------------------------------

export function useSystemSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["system", "settings"],
    queryFn: fetchSystemSettings,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: () => {
      toast.success("Timezone updated");
      void queryClient.invalidateQueries({ queryKey: ["system", "settings"] });
    },
    onError: () => toast.error("Failed to update timezone"),
  });

  return {
    settings: query.data,
    timezone: query.data?.timezone,
    isLoading: query.isLoading,
    updateTimezone: (timezone: string) => mutation.mutate(timezone),
    isSaving: mutation.isPending,
  };
}

// Read-only convenience for components that only need the timezone string
// for formatting (not the full settings card) — same cache entry, no extra
// request.
export function useTimezone(): string | undefined {
  const { data } = useQuery({
    queryKey: ["system", "settings"],
    queryFn: fetchSystemSettings,
    staleTime: 5 * 60_000,
  });
  return data?.timezone;
}
