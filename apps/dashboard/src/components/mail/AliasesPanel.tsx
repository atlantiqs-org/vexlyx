"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Forward,
  Plus,
  Search,
  Trash2,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import { useMail } from "@/hooks/useMail";
import { useAliases } from "@/hooks/useAliases";
import type { AliasResponse } from "@vexlyx/shared";

export function AliasesPanel() {
  const { domains } = useMail();
  const { aliases, isLoading, createAlias, deleteAlias } = useAliases();

  const [searchQuery, setSearchQuery] = useState("");

  // Create alias dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [localPart, setLocalPart] = useState("");
  const [domainId, setDomainId] = useState<string>("");
  const [isCatchAll, setIsCatchAll] = useState(false);
  const [destinations, setDestinations] = useState<string[]>([""]);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<AliasResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredAliases = useMemo(() => {
    if (!searchQuery.trim()) return aliases;
    const q = searchQuery.toLowerCase();
    return aliases.filter(
      (a) =>
        a.source.toLowerCase().includes(q) ||
        a.destinations.some((d) => d.toLowerCase().includes(q)),
    );
  }, [aliases, searchQuery]);

  const resetCreateForm = () => {
    setLocalPart("");
    setDomainId("");
    setIsCatchAll(false);
    setDestinations([""]);
  };

  const handleAddDestination = () => setDestinations((prev) => [...prev, ""]);
  const handleRemoveDestination = (index: number) =>
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  const handleDestinationChange = (index: number, value: string) =>
    setDestinations((prev) => prev.map((d, i) => (i === index ? value : d)));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainId) {
      toast.error("Please select a domain");
      return;
    }
    const cleanedDestinations = destinations.map((d) => d.trim()).filter(Boolean);
    if (cleanedDestinations.length === 0) {
      toast.error("At least one destination is required");
      return;
    }
    setIsCreating(true);
    try {
      const alias = await createAlias({
        localPart: isCatchAll ? undefined : localPart,
        isCatchAll,
        domainId,
        destinations: cleanedDestinations,
      });
      setIsCreateOpen(false);
      resetCreateForm();
      toast.success(`Alias ${alias.source} created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create alias");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAlias(deleteTarget.id);
      toast.success(`Alias ${deleteTarget.source} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete alias");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter aliases by address…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              size="sm"
              className="gap-2"
              onClick={() => setIsCreateOpen(true)}
              disabled={domains.length === 0}
            >
              <Plus className="h-4 w-4" />
              Create Alias
            </Button>
          </div>

          {domains.length === 0 && !isLoading && (
            <p className="mt-3 text-xs text-muted-foreground">
              Add a virtual domain in the Domains &amp; Email Auth tab before creating aliases.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredAliases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <Forward className="h-10 w-10 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No Aliases Yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an alias to forward mail from one address to one or more destinations.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Destinations</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAliases.map((alias) => (
                  <TableRow key={alias.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Forward className="h-3.5 w-3.5 text-muted-foreground" />
                        {alias.source}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {alias.destinations.map((d) => (
                          <Badge key={d} variant="outline" className="font-normal">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {alias.isCatchAll ? (
                        <Badge
                          variant="outline"
                          className="border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        >
                          Catch-all
                        </Badge>
                      ) : (
                        <Badge variant="outline">Forward</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:text-rose-600 dark:text-rose-400"
                        aria-label="Delete alias"
                        onClick={() => setDeleteTarget(alias)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Alias Dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forward className="h-5 w-5 text-indigo-500" />
              Create Alias
            </DialogTitle>
            <DialogDescription>
              Forwards mail sent to this address to one or more destination mailboxes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isCatchAll">Catch-all for domain</Label>
                <p className="text-xs text-muted-foreground">
                  Forwards any unmatched address at this domain. Only one per domain.
                </p>
              </div>
              <Switch id="isCatchAll" checked={isCatchAll} onCheckedChange={setIsCatchAll} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="localPart">Source Address</Label>
              <div className="flex items-center gap-2">
                {!isCatchAll && (
                  <Input
                    id="localPart"
                    required
                    placeholder="sales"
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
                    className="flex-1"
                  />
                )}
                <span className="text-sm text-muted-foreground">@</span>
                <Select value={domainId} onValueChange={setDomainId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => (
                      <SelectItem key={d.domainId} value={d.domainId}>
                        {d.hostname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Destinations</Label>
              <div className="space-y-2">
                {destinations.map((destination, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      required
                      type="email"
                      placeholder="user@domain.com"
                      value={destination}
                      onChange={(e) => handleDestinationChange(index, e.target.value)}
                      className="flex-1"
                    />
                    {destinations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground"
                        aria-label="Remove destination"
                        onClick={() => handleRemoveDestination(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleAddDestination}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Another Destination
              </Button>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating…" : "Create Alias"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
              Delete Alias
            </DialogTitle>
            <DialogDescription>
              This permanently deletes{" "}
              <span className="font-medium text-foreground">{deleteTarget?.source}</span> and
              stops forwarding to its destinations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete Alias"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
