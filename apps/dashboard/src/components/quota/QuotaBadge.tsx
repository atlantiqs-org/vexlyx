"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuotaUsage } from "@vexlyx/shared";

interface QuotaBadgeProps {
  label: string;
  usage?: QuotaUsage;
  isLoading?: boolean;
  className?: string;
}

/**
 * Inline "used / limit" indicator shown next to the create button on each
 * resource page (Projects, Domains, Databases, Mailboxes, Sub-accounts) so
 * users see what they're allowed before hitting a QUOTA_EXCEEDED error.
 */
export function QuotaBadge({ label, usage, isLoading, className }: QuotaBadgeProps) {
  if (isLoading || !usage) {
    return <Skeleton className={cn("h-4 w-24", className)} />;
  }

  const { limit } = usage;
  const isUnlimited = limit === null;
  const isAtLimit = limit !== null && usage.used >= limit;
  const isNearLimit = limit !== null && usage.used >= limit * 0.8;

  return (
    <span
      className={cn(
        "text-xs font-medium text-muted-foreground",
        isAtLimit && "text-rose-600 dark:text-rose-400",
        isNearLimit && !isAtLimit && "text-amber-600 dark:text-amber-400",
        className,
      )}
    >
      {label}: {usage.used}
      {isUnlimited ? " (Unlimited)" : ` / ${limit}`}
    </span>
  );
}

/** True once `usage` reports the caller is at or over their limit. */
export function isQuotaAtLimit(usage?: QuotaUsage): boolean {
  return !!usage && usage.limit !== null && usage.used >= usage.limit;
}
