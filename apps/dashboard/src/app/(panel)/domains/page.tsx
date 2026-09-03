"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FolderGit2,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { useDomains } from "@/hooks/useDomains";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import type { DomainResponse, DomainStatus } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Helpers & Types
// ---------------------------------------------------------------------------

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const STATUS_CONFIG: Record<
  DomainStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  ACTIVE: {
    label: "Active",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  PENDING: {
    label: "Pending Verification",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  ERROR: {
    label: "Verification Failed",
    icon: AlertCircle,
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function DomainListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border border-border">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-2 flex justify-between">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DomainsPage() {
  const {
    domains,
    isLoading,
    isRefreshing,
    refresh,
    createDomain,
    verifyDomain,
    deleteDomain,
  } = useDomains();

  const { projects } = useProjects();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");

  // Add domain modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newHostname, setNewHostname] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [isAdding, setIsAdding] = useState(false);

  // Instructions modal state
  const [instructionsDomain, setInstructionsDomain] = useState<DomainResponse | null>(null);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Verification in-progress state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<DomainResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered domains list
  const filteredDomains = useMemo(() => {
    return domains.filter((domain) => {
      // Search filter
      if (
        searchQuery &&
        !domain.hostname.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && domain.status !== statusFilter) {
        return false;
      }

      // Project filter
      if (projectFilter !== "ALL") {
        if (projectFilter === "UNASSIGNED") {
          if (domain.projectId) return false;
        } else if (domain.projectId !== projectFilter) {
          return false;
        }
      }

      return true;
    });
  }, [domains, searchQuery, statusFilter, projectFilter]);

  const copyToClipboard = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHostname = newHostname.trim().toLowerCase();
    if (!cleanHostname) {
      toast.error("Please enter a domain name");
      return;
    }

    setIsAdding(true);
    try {
      const created = await createDomain({
        hostname: cleanHostname,
        projectId: selectedProjectId === "none" ? undefined : selectedProjectId,
      });

      toast.success(`Domain "${cleanHostname}" created`);
      setNewHostname("");
      setSelectedProjectId("none");
      setAddModalOpen(false);

      // Open instructions modal immediately
      setInstructionsDomain(created);
      setInstructionsModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add domain";
      toast.error(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domain: DomainResponse) => {
    setVerifyingId(domain.id);
    try {
      const res = await verifyDomain(domain.id);
      if (res.verified) {
        toast.success(res.message);
        setInstructionsModalOpen(false);
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast.error(msg);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteDomain(deleteTarget.id);
      toast.success(`Domain "${deleteTarget.hostname}" removed`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove domain";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Domains
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage custom domain names, DNS TXT ownership verification, and automatic Traefik routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={isRefreshing || isLoading}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          <Button
            id="add-domain-btn"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Domain
          </Button>
        </div>
      </div>

      <Separator />

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search domains…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ERROR">Verification Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Project filter */}
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9 w-[170px] text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Projects</SelectItem>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Domains List ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <DomainListSkeleton />
      ) : filteredDomains.length === 0 ? (
        <Card className="border border-dashed border-border py-12 text-center">
          <CardContent className="flex flex-col items-center justify-center p-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">
              {searchQuery || statusFilter !== "ALL" || projectFilter !== "ALL"
                ? "No matching domains found"
                : "No custom domains yet"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {searchQuery || statusFilter !== "ALL" || projectFilter !== "ALL"
                ? "Try adjusting your search or filters."
                : "Attach a custom domain to route live web traffic to any of your deployed projects."}
            </p>
            {!searchQuery && statusFilter === "ALL" && projectFilter === "ALL" && (
              <Button
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="mt-4 h-8 text-xs font-medium"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Your First Domain
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDomains.map((domain) => {
            const statusCfg = STATUS_CONFIG[domain.status] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = statusCfg.icon;
            const isVerifying = verifyingId === domain.id;

            return (
              <Card
                key={domain.id}
                className="border border-border flex flex-col justify-between hover:border-border/80 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn("gap-1 text-[10px] font-medium py-0.5 px-2", statusCfg.className)}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(domain)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete domain"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    <CardTitle className="font-mono text-base font-semibold truncate">
                      {domain.hostname}
                    </CardTitle>

                    {domain.status === "ACTIVE" && (
                      <a
                        href={`http://${domain.hostname}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title="Open domain"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                    <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {domain.project ? (
                      <Link
                        href={`/projects/${domain.project.id}`}
                        className="truncate text-foreground hover:underline font-medium"
                      >
                        {domain.project.name}
                      </Link>
                    ) : (
                      <span className="italic text-muted-foreground">Unassigned</span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="rounded-md border border-border bg-muted/30 p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Traefik Routing:</span>
                      <span className="font-medium text-foreground">
                        {domain.status === "ACTIVE" ? "Active (Port 80)" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Added:</span>
                      <span className="text-foreground">{formatDate(domain.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInstructionsDomain(domain);
                        setInstructionsModalOpen(true);
                      }}
                      className="h-8 flex-1 text-xs gap-1"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      DNS Instructions
                    </Button>

                    {domain.status !== "ACTIVE" && (
                      <Button
                        size="sm"
                        onClick={() => void handleVerify(domain)}
                        disabled={isVerifying}
                        className="h-8 text-xs shrink-0"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Verifying…
                          </>
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add Domain Modal ──────────────────────────────────────────────── */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddDomain}>
            <DialogHeader>
              <DialogTitle>Add Custom Domain</DialogTitle>
              <DialogDescription>
                Connect a custom domain name to route incoming web requests to one of your projects.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="global-domain-hostname">Domain Name</Label>
                <Input
                  id="global-domain-hostname"
                  placeholder="e.g. app.mycompany.com or example.com"
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value)}
                  disabled={isAdding}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Do not include http://, https://, or slashes.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="global-project-select">Target Project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                  disabled={isAdding}
                >
                  <SelectTrigger id="global-project-select">
                    <SelectValue placeholder="Select target project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Unassigned)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Traefik routes requests on this domain directly to the selected project&rsquo;s container.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAdding}>
                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Domain
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DNS Instructions Modal ────────────────────────────────────────── */}
      <Dialog open={instructionsModalOpen} onOpenChange={setInstructionsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Verify Domain Ownership
            </DialogTitle>
            <DialogDescription>
              Configure the following DNS TXT record in your registrar DNS management zone.
            </DialogDescription>
          </DialogHeader>

          {instructionsDomain && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="font-semibold text-muted-foreground">Record Type</div>
                  <div className="font-semibold text-muted-foreground">Host / Name</div>
                  <div className="font-semibold text-muted-foreground">TTL</div>
                  <div className="font-mono text-foreground font-bold">TXT</div>
                  <div className="font-mono text-foreground break-all">
                    _vexlyx-challenge.{instructionsDomain.hostname}
                  </div>
                  <div className="font-mono text-foreground">300 (or Auto)</div>
                </div>

                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      TXT Record Value
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          instructionsDomain.verificationInstructions?.recordValue ??
                            `vexlyx-verification=${instructionsDomain.verificationToken ?? ""}`,
                          "txt-value-global",
                        )
                      }
                      className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary"
                    >
                      {copiedField === "txt-value-global" ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy Value
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="rounded border border-border bg-background p-2 font-mono text-xs text-foreground break-all select-all">
                    {instructionsDomain.verificationInstructions?.recordValue ??
                      `vexlyx-verification=${instructionsDomain.verificationToken ?? ""}`}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                Once DNS propagation is complete, click &ldquo;Verify DNS Records&rdquo; to validate and activate Traefik routing.
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInstructionsModalOpen(false)}
            >
              Close
            </Button>
            {instructionsDomain && instructionsDomain.status !== "ACTIVE" && (
              <Button
                type="button"
                onClick={() => void handleVerify(instructionsDomain)}
                disabled={verifyingId === instructionsDomain.id}
              >
                {verifyingId === instructionsDomain.id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Verify DNS Records
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Domain</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &ldquo;{deleteTarget?.hostname}&rdquo;?
              Traffic routing via Traefik will be disabled immediately.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
