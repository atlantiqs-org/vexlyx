import type { Metadata } from "next";
import {
  FolderKanban,
  Rocket,
  Globe,
  Database,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard home page — shows overview stats and quick actions.
 * Currently uses placeholder data with loading skeletons.
 * Will be connected to real API data in Phase 1.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your hosting environment.
        </p>
      </div>

      {/* Stat cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value="0"
          description="No projects yet"
          icon={FolderKanban}
        />
        <StatCard
          title="Active Deployments"
          value="0"
          description="No active deployments"
          icon={Rocket}
        />
        <StatCard
          title="Domains"
          value="0"
          description="No domains configured"
          icon={Globe}
        />
        <StatCard
          title="Databases"
          value="0"
          description="No databases provisioned"
          icon={Database}
        />
      </div>

      {/* Placeholder for future content */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Getting Started</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome to Vexlyx. Create your first project to get started with
          deploying applications.
        </p>
      </div>
    </div>
  );
}
