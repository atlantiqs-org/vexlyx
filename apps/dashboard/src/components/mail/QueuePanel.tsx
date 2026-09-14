"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Inbox,
  Search,
  Trash2,
  Pause,
  Play,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useQueue } from "@/hooks/useQueue";
import { cn } from "@/lib/utils";
import { refreshIconClassName } from "@/hooks/useRefreshAnimation";
import type { QueueMessage } from "@vexlyx/shared";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function QueuePanel() {
  const {
    queue,
    isLoading,
    isRefreshing,
    refresh,
    deleteMessage,
    flushAll,
    flushMessage,
    holdMessage,
    releaseMessage,
  } = useQueue();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<QueueMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFlushingAll, setIsFlushingAll] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const filteredMessages = useMemo(() => {
    const messages = queue?.messages ?? [];
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.sender.toLowerCase().includes(q) ||
        m.recipients.some((r) => r.toLowerCase().includes(q)) ||
        m.queueId.toLowerCase().includes(q),
    );
  }, [queue, searchQuery]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteMessage(deleteTarget.queueId);
      toast.success(`Deleted queued message ${deleteTarget.queueId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete message");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleFlushAll = async () => {
    setIsFlushingAll(true);
    try {
      await flushAll();
      toast.success("Queue flush triggered — retrying all deferred deliveries");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to flush queue");
    } finally {
      setIsFlushingAll(false);
    }
  };

  const handleFlushOne = async (queueId: string) => {
    setPendingAction(`flush-${queueId}`);
    try {
      await flushMessage(queueId);
      toast.success(`Requeued ${queueId} for immediate delivery`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to flush message");
    } finally {
      setPendingAction(null);
    }
  };

  const handleHold = async (queueId: string) => {
    setPendingAction(`hold-${queueId}`);
    try {
      await holdMessage(queueId);
      toast.success(`Held ${queueId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to hold message");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRelease = async (queueId: string) => {
    setPendingAction(`release-${queueId}`);
    try {
      await releaseMessage(queueId);
      toast.success(`Released ${queueId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to release message");
    } finally {
      setPendingAction(null);
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
                placeholder="Filter by sender, recipient, or queue ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void refresh()}
                disabled={isRefreshing}
              >
                <RefreshCw className={refreshIconClassName(isRefreshing, "h-4 w-4")} />
                Refresh
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleFlushAll}
                disabled={isFlushingAll || (queue?.totalCount ?? 0) === 0}
              >
                <Zap className={cn("h-4 w-4", isFlushingAll && "animate-spin")} />
                {isFlushingAll ? "Flushing…" : "Flush All"}
              </Button>
            </div>
          </div>
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
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-base font-semibold text-foreground">Queue Is Empty</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No messages are currently queued, deferred, or held in Postfix.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue ID</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.map((message) => (
                  <TableRow key={message.queueId}>
                    <TableCell className="font-mono text-xs text-foreground">
                      {message.queueId}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{message.sender}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {message.recipients.map((r) => (
                          <Badge key={r} variant="outline" className="font-normal">
                            {r}
                          </Badge>
                        ))}
                      </div>
                      {message.reason && (
                        <p
                          className="mt-1 max-w-xs truncate text-[11px] text-muted-foreground"
                          title={message.reason}
                        >
                          {message.reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatSize(message.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {message.arrivalTime}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          message.flagged === "held"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : message.reason
                              ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
                        )}
                      >
                        {message.flagged === "held"
                          ? "Held"
                          : message.reason
                            ? "Deferred"
                            : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {message.flagged === "held" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-600 dark:text-emerald-400"
                            aria-label="Release message"
                            onClick={() => void handleRelease(message.queueId)}
                            disabled={pendingAction === `release-${message.queueId}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-600 dark:text-amber-400"
                            aria-label="Hold message"
                            onClick={() => void handleHold(message.queueId)}
                            disabled={pendingAction === `hold-${message.queueId}`}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-600 dark:text-indigo-400"
                          aria-label="Flush message now"
                          onClick={() => void handleFlushOne(message.queueId)}
                          disabled={pendingAction === `flush-${message.queueId}`}
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:text-rose-600 dark:text-rose-400"
                          aria-label="Delete message"
                          onClick={() => setDeleteTarget(message)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
              Delete Queued Message
            </DialogTitle>
            <DialogDescription>
              This permanently removes message{" "}
              <span className="font-medium text-foreground">{deleteTarget?.queueId}</span> from the
              Postfix queue. It will never be delivered. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
