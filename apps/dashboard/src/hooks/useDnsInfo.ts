"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import type { DnsOnboardingInfoResponse, DnsVerificationResponse } from "@vexlyx/shared";

// F5.11 — reads F5.9's GET /api/system/dns-info. ADMIN-only on the API side,
// so `enabled` lets the Settings page skip the request entirely for other
// roles instead of triggering a guaranteed 403.
export function useDnsInfo(enabled: boolean) {
  const [info, setInfo] = useState<DnsOnboardingInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [verification, setVerification] = useState<DnsVerificationResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchInfo = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const data = await fetchAPI<DnsOnboardingInfoResponse>("/api/system/dns-info");
      setInfo(data);
    } catch {
      setInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchInfo();
  }, [fetchInfo]);

  // Live DNS-propagation check (F5.11 UX follow-up) — real outbound
  // resolver queries, so this is user-triggered rather than automatic.
  const verify = useCallback(async () => {
    setIsVerifying(true);
    try {
      const data = await fetchAPI<DnsVerificationResponse>("/api/system/dns-info/verify", {
        method: "POST",
      });
      setVerification(data);
      return data;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return { info, isLoading, refresh: fetchInfo, verification, isVerifying, verify };
}
