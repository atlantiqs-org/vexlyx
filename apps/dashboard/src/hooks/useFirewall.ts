"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FirewallStatusResponse, CreateFirewallRuleInput, UpdateFirewallSettingsInput } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// API client helpers
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function extractError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

async function fetchFirewallStatus(): Promise<FirewallStatusResponse> {
  const res = await fetch(`${API_URL}/api/firewall`, { credentials: "include" });
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch firewall status"));
  return res.json() as Promise<FirewallStatusResponse>;
}

async function addFirewallRule(input: CreateFirewallRuleInput): Promise<void> {
  const res = await fetch(`${API_URL}/api/firewall/rules`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to add rule"));
}

async function deleteFirewallRule(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/firewall/rules/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(await extractError(res, "Failed to delete rule"));
}

async function updateFirewallSettings(input: UpdateFirewallSettingsInput): Promise<void> {
  const res = await fetch(`${API_URL}/api/firewall/settings`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to update default policy"));
}

// ---------------------------------------------------------------------------
// useFirewall
// ---------------------------------------------------------------------------

export function useFirewall() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["firewall"],
    queryFn: fetchFirewallStatus,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["firewall"] });

  const addMutation = useMutation({
    mutationFn: addFirewallRule,
    onSuccess: () => {
      toast.success("Firewall rule added");
      void invalidate();
    },
    onError: (err: Error) => toast.error("Failed to add rule", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFirewallRule,
    onSuccess: () => {
      toast.success("Firewall rule removed");
      void invalidate();
    },
    onError: (err: Error) => toast.error("Failed to remove rule", { description: err.message }),
  });

  const settingsMutation = useMutation({
    mutationFn: updateFirewallSettings,
    onSuccess: () => {
      toast.success("Default policy updated");
      void invalidate();
    },
    onError: (err: Error) => toast.error("Failed to update default policy", { description: err.message }),
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    addRule: (input: CreateFirewallRuleInput) => addMutation.mutateAsync(input),
    isAdding: addMutation.isPending,
    deleteRule: (id: string) => deleteMutation.mutate(id),
    updateSettings: (input: UpdateFirewallSettingsInput) => settingsMutation.mutateAsync(input),
    isSavingSettings: settingsMutation.isPending,
  };
}
