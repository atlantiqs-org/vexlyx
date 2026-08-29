"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiRequestError } from "@/lib/api";
import type { CreateProjectInput, ProjectType } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Project type options shown in the select dropdown
// ---------------------------------------------------------------------------

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "NODEJS", label: "Node.js" },
  { value: "NEXTJS", label: "Next.js" },
  { value: "PYTHON", label: "Python" },
  { value: "REACT", label: "React" },
  { value: "STATIC", label: "Static Site" },
  { value: "PHP", label: "PHP" },
  { value: "WORDPRESS", label: "WordPress" },
  { value: "DOCKER", label: "Docker" },
];

// ---------------------------------------------------------------------------
// Form state + validation errors
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  type: ProjectType | "";
  gitUrl: string;
}

interface FormErrors {
  name?: string;
  type?: string;
  gitUrl?: string;
}

function validateForm(state: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!state.name.trim()) {
    errors.name = "Project name is required";
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(state.name)) {
    errors.name = "Lowercase letters, numbers, and hyphens only (e.g. my-app)";
  } else if (state.name.length > 60) {
    errors.name = "Must be 60 characters or fewer";
  }

  if (!state.type) {
    errors.type = "Select a project type";
  }

  if (state.gitUrl && !/^https?:\/\/.+/.test(state.gitUrl)) {
    errors.gitUrl = "Must be a valid URL (https://...)";
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProjectInput) => Promise<unknown>;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  onSubmit,
}: CreateProjectModalProps) {
  const [form, setForm] = useState<FormState>({ name: "", type: "", gitUrl: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!isSubmitting) {
      onOpenChange(next);
      if (!next) {
        setForm({ name: "", type: "", gitUrl: "" });
        setErrors({});
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        type: form.type as ProjectType,
        gitUrl: form.gitUrl.trim() || undefined,
        branch: "main",
      });
      toast.success(`Project "${form.name}" created`);
      handleOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to create project";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Deploy an app from a Git repository or start with a template.
          </DialogDescription>
        </DialogHeader>

        <form id="create-project-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Project name */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="my-app"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              disabled={isSubmitting}
              autoComplete="off"
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Project type */}
          <div className="space-y-1.5">
            <Label htmlFor="project-type">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.type}
              onValueChange={(value) => {
                setForm((prev) => ({ ...prev, type: value as ProjectType }));
                if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger id="project-type">
                <SelectValue placeholder="Select a framework..." />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type}</p>
            )}
          </div>

          {/* Git URL (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="project-git-url">
              Git URL{" "}
              <span className="text-xs text-muted-foreground font-normal">optional</span>
            </Label>
            <Input
              id="project-git-url"
              placeholder="https://github.com/user/repo"
              type="url"
              value={form.gitUrl}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, gitUrl: e.target.value }));
                if (errors.gitUrl) setErrors((prev) => ({ ...prev, gitUrl: undefined }));
              }}
              disabled={isSubmitting}
            />
            {errors.gitUrl && (
              <p className="text-xs text-destructive">{errors.gitUrl}</p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            id="create-project-submit"
            type="submit"
            form="create-project-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
