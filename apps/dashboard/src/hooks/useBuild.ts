"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import type { Deployment } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Terminal statuses — polling stops when one of these is reached
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES: Deployment["status"][] = [
  "RUNNING",
  "FAILED",
  "CANCELLED",
];

// ---------------------------------------------------------------------------
// Hook: trigger a build
// ---------------------------------------------------------------------------

export function useTriggerBuild(projectId: string) {
  const [isTriggering, setIsTriggering] = useState(false);

  const triggerBuild = useCallback(
    async (buildCmd?: string): Promise<Deployment | null> => {
      setIsTriggering(true);
      try {
        const body = buildCmd ? { buildCmd } : {};
        const deployment = await fetchAPI<Deployment>(
          `/api/projects/${projectId}/build`,
          { method: "POST", body: JSON.stringify(body) },
        );
        return deployment;
      } finally {
        setIsTriggering(false);
      }
    },
    [projectId],
  );

  return { triggerBuild, isTriggering };
}

// ---------------------------------------------------------------------------
// Hook: poll a single deployment for status + log updates
// ---------------------------------------------------------------------------

interface UseDeploymentPollingResult {
  deployment: Deployment | null;
  isPolling: boolean;
  error: string | null;
}

export function useDeploymentPolling(
  projectId: string,
  deploymentId: string | null,
  intervalMs = 3000,
): UseDeploymentPollingResult {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    if (!deploymentId) return;

    try {
      const data = await fetchAPI<Deployment>(
        `/api/projects/${projectId}/deployments/${deploymentId}`,
      );
      setDeployment(data);
      setError(null);

      if (TERMINAL_STATUSES.includes(data.status)) {
        setIsPolling(false);
        return;
      }

      // Schedule next poll
      timerRef.current = setTimeout(() => void poll(), intervalMs);
    } catch {
      setError("Failed to fetch deployment status");
      setIsPolling(false);
    }
  }, [projectId, deploymentId, intervalMs]);

  useEffect(() => {
    if (!deploymentId) return;

    setIsPolling(true);
    setError(null);
    void poll();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [deploymentId, poll]);

  return { deployment, isPolling, error };
}

// ---------------------------------------------------------------------------
// Hook: list deployments for a project (latest 10)
// ---------------------------------------------------------------------------

export function useDeployments(projectId: string) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDeployments = useCallback(async () => {
    try {
      const data = await fetchAPI<{ deployments: Deployment[] }>(
        `/api/projects/${projectId}/deployments?limit=10`,
      );
      setDeployments(data.deployments);
      setError(null);
    } catch {
      setError("Failed to load deployments");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchDeployments();
  }, [fetchDeployments]);

  // If any deployment is actively queued/building/deploying, auto-poll every 3s
  useEffect(() => {
    const hasActive = deployments.some((d) =>
      ["QUEUED", "BUILDING", "DEPLOYING"].includes(d.status),
    );

    if (hasActive) {
      pollTimerRef.current = setTimeout(() => {
        void fetchDeployments();
      }, 3000);
    }

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [deployments, fetchDeployments]);

  return { deployments, isLoading, error, refetch: fetchDeployments };
}

