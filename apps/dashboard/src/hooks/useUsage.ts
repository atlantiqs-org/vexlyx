"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import type { UsageSummary } from "@vexlyx/shared";

/**
 * The current user's own quota/usage breakdown (used vs. limit for
 * projects/domains/databases/mailboxes, plus sub-accounts for resellers) —
 * powers the "Your Plan" dashboard widget so users can see what they're
 * allowed before hitting a QUOTA_EXCEEDED error.
 */
export function useUsage() {
  const query = useQuery({
    queryKey: ["usage", "me"],
    queryFn: () => fetchAPI<UsageSummary>("/api/users/me/usage"),
  });

  return { usage: query.data, isLoading: query.isLoading };
}
