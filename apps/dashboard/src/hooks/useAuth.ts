"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import type { User } from "@vexlyx/shared";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchUser = useCallback(async () => {
    try {
      const data = await fetchAPI<{ user: User }>("/api/auth/me");
      setState({ user: data.user, isLoading: false, isAuthenticated: true });
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await fetchAPI<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Drop any cached query results from a previous session in this tab —
    // the QueryClient persists across client-side navigation (no hard
    // reload on login/logout), so without this a just-logged-in user could
    // briefly see the previous account's cached data (e.g. its full user
    // list) until each query's staleTime naturally expires.
    queryClient.clear();
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
    router.push("/dashboard");
    return data.user;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => {
    const data = await fetchAPI<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });
    queryClient.clear();
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
    router.push("/dashboard");
    return data.user;
  };

  const logout = async () => {
    try {
      await fetchAPI("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the API call fails, clear local state
    }
    queryClient.clear();
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push("/login");
  };

  return {
    ...state,
    login,
    register,
    logout,
    refetch: fetchUser,
  };
}
