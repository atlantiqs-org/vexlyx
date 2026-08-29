"use client";

import { FolderKanban, Plus } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Project } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Skeleton placeholder shown while projects are loading
// ---------------------------------------------------------------------------

function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state shown when user has no projects
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  onNewProject: () => void;
}

function EmptyState({ onNewProject }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted">
        <FolderKanban className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">No projects yet</h3>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        Deploy your first app in seconds. Connect a Git repository or start from a template.
      </p>
      <Button
        id="empty-state-new-project"
        onClick={onNewProject}
        className="mt-6"
        size="sm"
      >
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main list component
// ---------------------------------------------------------------------------

interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  onNewProject: () => void;
}

export function ProjectList({ projects, isLoading, onNewProject }: ProjectListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return <EmptyState onNewProject={onNewProject} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
