"use client";

import { ScrollText, RefreshCw } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMail } from "@/hooks/useMail";
import { useDeliveryLog, type DeliveryLogStatusFilter } from "@/hooks/useDeliveryLog";
import { cn } from "@/lib/utils";
import { refreshIconClassName } from "@/hooks/useRefreshAnimation";

const STATUS_BADGE_CLASS: Record<string, string> = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  deferred: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  bounced: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function DeliveryLogPanel() {
  const { domains } = useMail();
  const {
    log,
    isLoading,
    isRefreshing,
    refresh,
    domain,
    setDomain,
    mailbox,
    setMailbox,
    status,
    setStatus,
  } = useDeliveryLog();

  const entries = log?.entries ?? [];

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={domain || "all"}
              onValueChange={(val) => setDomain(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="All domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d.domainId} value={d.hostname}>
                    {d.hostname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by mailbox address…"
              value={mailbox}
              onChange={(e) => setMailbox(e.target.value)}
              className="w-full sm:w-64"
            />

            <Select
              value={status}
              onValueChange={(val) => setStatus(val as DeliveryLogStatusFilter)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 sm:ml-auto"
              onClick={() => void refresh()}
              disabled={isRefreshing}
            >
              <RefreshCw className={refreshIconClassName(isRefreshing, "h-4 w-4")} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <ScrollText className="h-10 w-10 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No Delivery Events Found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Send a test email or adjust the filters above to see delivery and bounce activity.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Relay</TableHead>
                  <TableHead>Delay</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow key={`${entry.queueId}-${idx}`}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {entry.timestamp}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{entry.recipient}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(STATUS_BADGE_CLASS[entry.status])}
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs text-muted-foreground">
                      {entry.relay ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.delay ?? "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-xs truncate text-xs text-muted-foreground"
                      title={entry.reason ?? undefined}
                    >
                      {entry.reason ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {log?.truncated && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the most recent matching entries — narrow the filters above to see more.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
