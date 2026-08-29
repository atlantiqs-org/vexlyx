"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/projects/ProjectList";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { useProjects } from "@/hooks/useProjects";

export default function ProjectsPage() {
  const { projects, isLoading, error, createProject, refetch } = useProjects();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage and deploy your hosted applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            id="refresh-projects"
            variant="outline"
            size="icon"
            onClick={() => void refetch()}
            disabled={isLoading}
            aria-label="Refresh projects"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            id="new-project-btn"
            onClick={() => setModalOpen(true)}
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Project grid / empty state / skeletons */}
      <ProjectList
        projects={projects}
        isLoading={isLoading}
        onNewProject={() => setModalOpen(true)}
      />

      {/* Create modal */}
      <CreateProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={createProject}
      />
    </div>
  );
}
