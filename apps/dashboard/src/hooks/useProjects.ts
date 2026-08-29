"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type { Project, PaginatedProjects, CreateProjectInput } from "@vexlyx/shared";

const POLL_INTERVAL_MS = 30_000;

interface ProjectsState {
  projects: Project[];
  pagination: PaginatedProjects["pagination"] | null;
  isLoading: boolean;
  error: string | null;
}

export function useProjects() {
  const [state, setState] = useState<ProjectsState>({
    projects: [],
    pagination: null,
    isLoading: true,
    error: null,
  });

  // Keep a ref to the interval so we can clear it on unmount
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProjects = useCallback(async (silent = false) => {
    if (!silent) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }
    try {
      const data = await fetchAPI<PaginatedProjects>("/api/projects?limit=100");
      setState({
        projects: data.projects,
        pagination: data.pagination,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to load projects";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    void fetchProjects();

    // Poll every 30s to pick up status changes from the deployment engine
    intervalRef.current = setInterval(() => {
      void fetchProjects(true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchProjects]);

  const createProject = async (data: CreateProjectInput): Promise<Project> => {
    const project = await fetchAPI<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
    // Optimistically prepend to the list without waiting for the next poll
    setState((prev) => ({
      ...prev,
      projects: [project, ...prev.projects],
    }));
    return project;
  };

  const deleteProject = async (id: string): Promise<void> => {
    await fetchAPI(`/api/projects/${id}`, { method: "DELETE" });
    // Optimistically remove from the list
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  };

  return {
    ...state,
    refetch: () => fetchProjects(),
    createProject,
    deleteProject,
  };
}
