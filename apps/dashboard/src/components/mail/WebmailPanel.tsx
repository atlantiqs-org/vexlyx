"use client";

import { AppWindow, ExternalLink, KeyRound, RefreshCw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebmail } from "@/hooks/useWebmail";
import { cn } from "@/lib/utils";
import { refreshIconClassName } from "@/hooks/useRefreshAnimation";

export function WebmailPanel() {
  const { status, activity, isLoading, isRefreshing, refresh } = useWebmail();

  const isActive = status?.status === "active";

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
                  <AppWindow className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Roundcube Webmail</h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {isActive ? "Running" : "Stopped"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {status?.lastChecked
                      ? `Last checked ${new Date(status.lastChecked).toLocaleTimeString()}`
                      : "Status unavailable"}
                  </p>
                </div>
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
                  disabled={!status?.url}
                  onClick={() => status?.url && window.open(status.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Webmail
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardContent className="flex items-start gap-3 pt-6">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Log in with a mailbox&apos;s full email address and password — the same credentials
            shown when a mailbox is created (or reset) in the{" "}
            <span className="font-medium text-foreground">Mailboxes</span> tab. Vexlyx does not
            store or auto-fill mailbox passwords.
          </p>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent Login Activity</h3>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !activity || activity.logins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No mailbox login activity available yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {activity.logins.map((login) => (
                <div
                  key={login.address}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm font-medium text-foreground">{login.address}</span>
                  <span className="text-xs text-muted-foreground">
                    {login.lastLogin
                      ? `Last login ${new Date(login.lastLogin).toLocaleString()}`
                      : "Never logged in"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
