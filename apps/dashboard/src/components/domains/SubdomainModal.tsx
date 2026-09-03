"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Globe,
  FolderGit2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DomainResponse, Project } from "@vexlyx/shared";


interface SubdomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentDomains: DomainResponse[];
  projects: Project[];
  defaultParentId?: string;
  defaultProjectId?: string;
  onCreated?: (domain: DomainResponse) => void;
  createDomain: (input: {
    hostname: string;
    projectId?: string | null;
    parentId?: string | null;
    pathPrefix?: string | null;
  }) => Promise<DomainResponse>;
}

export function SubdomainModal({
  open,
  onOpenChange,
  parentDomains,
  projects,
  defaultParentId,
  defaultProjectId,
  onCreated,
  createDomain,
}: SubdomainModalProps) {
  // Available root / parent domains (non-wildcard, root domains)
  const availableParents = useMemo(() => {
    return parentDomains.filter((d) => !d.hostname.startsWith("*.") && !d.parentId);
  }, [parentDomains]);

  const [selectedParentId, setSelectedParentId] = useState<string>(
    defaultParentId || (availableParents[0]?.id ?? ""),
  );
  const [subdomainPrefix, setSubdomainPrefix] = useState("");
  const [isWildcard, setIsWildcard] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || "none",
  );
  const [pathPrefix, setPathPrefix] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync defaultParentId when opened
  const currentParent = useMemo(() => {
    return availableParents.find((d) => d.id === selectedParentId) || availableParents[0];
  }, [availableParents, selectedParentId]);

  // Computed full hostname
  const fullHostname = useMemo(() => {
    if (!currentParent) return "";
    if (isWildcard) return `*.${currentParent.hostname}`;
    const cleanSub = subdomainPrefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSub) return currentParent.hostname;
    return `${cleanSub}.${currentParent.hostname}`;
  }, [currentParent, isWildcard, subdomainPrefix]);

  const targetProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const isParentActive = currentParent?.status === "ACTIVE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentParent) {
      toast.error("Please add a primary domain first");
      return;
    }

    if (!isWildcard && !subdomainPrefix.trim()) {
      toast.error("Please enter a subdomain prefix (e.g. api, blog, app)");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createDomain({
        hostname: fullHostname,
        parentId: currentParent.id,
        projectId: selectedProjectId !== "none" ? selectedProjectId : null,
        pathPrefix: pathPrefix.trim() ? pathPrefix.trim() : null,
      });

      if (created.status === "ACTIVE") {
        toast.success(`Subdomain "${fullHostname}" active and Traefik router created!`);
      } else {
        toast.success(`Subdomain "${fullHostname}" created`);
      }

      onCreated?.(created);
      onOpenChange(false);
      setSubdomainPrefix("");
      setIsWildcard(false);
      setPathPrefix("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create subdomain";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="h-4 w-4" />
              </div>
              <DialogTitle>Add Subdomain</DialogTitle>
            </div>
            <DialogDescription>
              Route subdomains or wildcard domains to specific projects with zero downtime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Parent Domain Selector */}
            <div className="space-y-2">
              <Label htmlFor="parentDomain">Parent Domain</Label>
              <Select
                value={currentParent?.id ?? ""}
                onValueChange={(val) => setSelectedParentId(val)}
                disabled={availableParents.length === 0}
              >
                <SelectTrigger id="parentDomain" className="w-full">
                  <SelectValue placeholder="Select verified domain" />
                </SelectTrigger>
                <SelectContent>
                  {availableParents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{parent.hostname}</span>
                        {parent.status === "ACTIVE" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          >
                            Verified
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30"
                          >
                            Pending
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subdomain Input / Wildcard toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subdomainPrefix">Subdomain Host</Label>
                <button
                  type="button"
                  onClick={() => setIsWildcard(!isWildcard)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  {isWildcard ? "Use specific prefix" : "Use wildcard (*.)"}
                </button>
              </div>

              {isWildcard ? (
                <div className="flex h-10 items-center rounded-lg border border-border bg-muted/40 px-3 font-mono text-sm">
                  <span className="text-primary font-semibold">*.</span>
                  <span className="text-foreground">{currentParent?.hostname || "example.com"}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    Wildcard catch-all
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="subdomainPrefix"
                      placeholder="api, blog, app..."
                      value={subdomainPrefix}
                      onChange={(e) =>
                        setSubdomainPrefix(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                      className="font-mono text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="flex h-9 items-center rounded-md border border-border bg-muted/30 px-3 font-mono text-sm text-muted-foreground">
                    .{currentParent?.hostname || "example.com"}
                  </div>
                </div>
              )}
            </div>

            {/* Target Project Selector */}
            <div className="space-y-2">
              <Label htmlFor="targetProject">Route to Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={(val) => setSelectedProjectId(val)}
              >
                <SelectTrigger id="targetProject" className="w-full">
                  <SelectValue placeholder="Select target project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No project (DNS only)</span>
                  </SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{proj.name}</span>
                        <span className="text-xs text-muted-foreground">({proj.type})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Live Routing Preview Card */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Traffic Routing Preview</span>
                {isParentActive && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Instant activation
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-foreground font-semibold">
                  http://{fullHostname || "..."}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-primary">
                  {targetProject ? targetProject.name : "Unassigned"}
                </span>
              </div>
              {isParentActive && (
                <p className="text-[11px] text-muted-foreground">
                  Because parent domain <strong className="text-foreground">{currentParent?.hostname}</strong> is already verified, this subdomain will instantly route traffic via Traefik.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !currentParent || (!isWildcard && !subdomainPrefix.trim())}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Attach Subdomain"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
