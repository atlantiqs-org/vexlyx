"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";

interface AuthConfig {
  allowRegistration: boolean;
}

/**
 * Public auth config (F5.8) — currently just whether self-registration is
 * enabled, so the login/register pages can hide/disable that flow when it's
 * turned off (the default for a closed panel where admins/resellers
 * provision users from /users).
 */
export function useAuthConfig() {
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    fetchAPI<AuthConfig>("/api/auth/config")
      .then(setConfig)
      .catch(() => setConfig({ allowRegistration: false }));
  }, []);

  return { allowRegistration: config?.allowRegistration ?? false, isLoading: config === null };
}
