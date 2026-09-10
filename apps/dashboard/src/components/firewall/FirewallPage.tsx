"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirewall } from "@/hooks/useFirewall";
import { FirewallRuleList } from "./FirewallRuleList";
import { AddRuleDialog } from "./AddRuleDialog";
import { DeleteRuleConfirmDialog } from "./DeleteRuleConfirmDialog";
import { DefaultPolicyCard } from "./DefaultPolicyCard";
import type { FirewallRuleResponse } from "@vexlyx/shared";

/**
 * Web-based UFW firewall management (F5.4) — live rule list, add/delete
 * rules, and default incoming/outgoing policy. Rules that would deny SSH or
 * panel access are refused server-side; destructive changes here (delete,
 * default policy) require an in-dialog confirmation before applying.
 */
export function FirewallPage() {
  const { status, isLoading, addRule, isAdding, deleteRule, updateSettings, isSavingSettings } = useFirewall();
  const [deleteTarget, setDeleteTarget] = useState<FirewallRuleResponse | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Firewall</h1>
          <p className="text-muted-foreground">Manage UFW rules and default traffic policy for this server.</p>
        </div>
        <AddRuleDialog onAdd={addRule} isAdding={isAdding} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Rules
            </CardTitle>
            {status && (
              <Badge variant={status.active ? "default" : "secondary"}>
                {status.active ? "Active" : "Inactive"}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <FirewallRuleList
              rules={status?.rules ?? []}
              isLoading={isLoading}
              protectedPorts={status?.protectedPorts ?? []}
              onDelete={setDeleteTarget}
            />
          </CardContent>
        </Card>

        <DefaultPolicyCard
          settings={status?.settings}
          isLoading={isLoading}
          onSave={updateSettings}
          isSaving={isSavingSettings}
        />
      </div>

      <DeleteRuleConfirmDialog
        rule={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteRule(deleteTarget.id);
        }}
      />
    </div>
  );
}
