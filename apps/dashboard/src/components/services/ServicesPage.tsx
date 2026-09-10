"use client";

import { useState } from "react";
import { useServices } from "@/hooks/useServices";
import { ServiceCard } from "./ServiceCard";
import { DockerDaemonCard } from "./DockerDaemonCard";
import { ServiceActionConfirmDialog } from "./ServiceActionConfirmDialog";
import { ServiceLogsDialog } from "./ServiceLogsDialog";
import type { ServiceAction, ServiceName } from "@vexlyx/shared";

const SERVICE_LABELS: Record<ServiceName, string> = {
  postfix: "Postfix",
  dovecot: "Dovecot",
  coredns: "CoreDNS",
  postgres: "PostgreSQL",
  redis: "Redis",
};

/**
 * Service Status Dashboard (F5.6) — live status, start/stop/restart
 * controls, and a log tail for every service this panel manages, plus a
 * read-only Docker daemon row. Stop/restart require confirmation since
 * these are shared server-wide services, not a single user's project.
 */
export function ServicesPage() {
  const { status, isLoading, performAction, isActing } = useServices();
  const [actingName, setActingName] = useState<ServiceName | null>(null);
  const [pendingAction, setPendingAction] = useState<{ name: ServiceName; label: string; action: ServiceAction } | null>(null);
  const [logsTarget, setLogsTarget] = useState<{ name: ServiceName; label: string } | null>(null);

  const runAction = async (name: ServiceName, action: ServiceAction) => {
    setActingName(name);
    try {
      await performAction(name, action);
    } finally {
      setActingName(null);
    }
  };

  const handleAction = (name: ServiceName, label: string, action: ServiceAction) => {
    if (action === "start") {
      void runAction(name, action);
      return;
    }
    setPendingAction({ name, label, action });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Services</h1>
        <p className="text-muted-foreground">
          Live status, controls, and logs for the services this panel manages.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && !status
          ? null
          : (status?.services ?? []).map((service) => (
              <ServiceCard
                key={service.name}
                label={SERVICE_LABELS[service.name]}
                status={service}
                isActing={isActing && actingName === service.name}
                onAction={(action) => handleAction(service.name, SERVICE_LABELS[service.name], action)}
                onViewLogs={() => setLogsTarget({ name: service.name, label: SERVICE_LABELS[service.name] })}
              />
            ))}
        <DockerDaemonCard running={status?.dockerDaemon.running} />
      </div>

      <ServiceActionConfirmDialog
        pending={pendingAction}
        isActing={isActing}
        onOpenChange={(open) => !open && setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) void runAction(pendingAction.name, pendingAction.action);
          setPendingAction(null);
        }}
      />

      <ServiceLogsDialog service={logsTarget} onOpenChange={(open) => !open && setLogsTarget(null)} />
    </div>
  );
}
