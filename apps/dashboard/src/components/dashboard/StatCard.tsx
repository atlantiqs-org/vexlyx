import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value?: string;
  description?: string;
  icon: LucideIcon;
  /** When true, shows skeleton placeholders instead of actual values */
  isLoading?: boolean;
  className?: string;
}

/**
 * Reusable stat card for the dashboard overview.
 * Shows a metric with icon, value, and optional description.
 * Supports a loading state with skeleton animation per CLAUDE.md Section 15
 * (pulse animation, never spinners).
 */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("border border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
