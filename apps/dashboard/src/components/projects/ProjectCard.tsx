"use client";

import Link from "next/link";
import {
  Globe,
  FolderKanban,
  Server,
  Code2,
  FileCode,
  FileText,
  Container,
  LayoutTemplate,
  GitBranch,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Project, ProjectType, ProjectStatus } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Type → icon mapping
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<ProjectType, React.ElementType> = {
  NODEJS: Server,
  NEXTJS: LayoutTemplate,
  PYTHON: Code2,
  REACT: FileCode,
  STATIC: FileText,
  PHP: FileCode,
  WORDPRESS: Globe,
  DOCKER: Container,
};

const TYPE_LABELS: Record<ProjectType, string> = {
  NODEJS: "Node.js",
  NEXTJS: "Next.js",
  PYTHON: "Python",
  REACT: "React",
  STATIC: "Static",
  PHP: "PHP",
  WORDPRESS: "WordPress",
  DOCKER: "Docker",
};

// ---------------------------------------------------------------------------
// Status → badge variant + label
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  CREATING: {
    label: "Creating",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  STOPPED: {
    label: "Stopped",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  },
  ERROR: {
    label: "Error",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  DELETED: {
    label: "Deleted",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

// ---------------------------------------------------------------------------
// Relative time helper — keeps the dep count at zero
// ---------------------------------------------------------------------------

function relativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const TypeIcon = TYPE_ICONS[project.type] ?? FolderKanban;
  const typeLabel = TYPE_LABELS[project.type] ?? project.type;
  const statusCfg = STATUS_CONFIG[project.status];

  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <Card
        className={cn(
          "border border-border bg-card transition-all duration-150",
          "hover:border-border/80 hover:shadow-sm",
          "group-focus-visible:ring-2 group-focus-visible:ring-ring",
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          {/* Icon + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground leading-tight">
                {project.name}
              </p>
              <p className="text-xs text-muted-foreground">{typeLabel}</p>
            </div>
          </div>

          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn("shrink-0 text-xs font-medium", statusCfg.className)}
          >
            {statusCfg.label}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-2 pt-0">
          {/* Git URL */}
          {project.gitUrl ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3 shrink-0" />
              <span className="truncate">{project.gitUrl.replace(/^https?:\/\//, "")}</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/50">No repository connected</div>
          )}

          {/* Updated at */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>Updated {relativeTime(project.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
