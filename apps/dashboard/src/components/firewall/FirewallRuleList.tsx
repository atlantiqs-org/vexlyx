"use client";

import { Lock, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FirewallRuleResponse } from "@vexlyx/shared";

interface FirewallRuleListProps {
  rules: FirewallRuleResponse[];
  isLoading: boolean;
  protectedPorts: number[];
  onDelete: (rule: FirewallRuleResponse) => void;
}

export function FirewallRuleList({ rules, isLoading, protectedPorts, onDelete }: FirewallRuleListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Shield className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No firewall rules</p>
        <p className="text-xs text-muted-foreground">Add a rule to open or block a port.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Port</TableHead>
          <TableHead>Protocol</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => {
          const isProtected = protectedPorts.includes(rule.port) && rule.action === "ALLOW";
          return (
            <TableRow key={rule.id}>
              <TableCell className="font-mono text-sm tabular-nums">{rule.port}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.protocol}</TableCell>
              <TableCell>
                <Badge variant={rule.action === "ALLOW" ? "default" : "destructive"}>{rule.action}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{rule.source ?? "Anywhere"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {rule.comment ?? (rule.managed ? "—" : "System rule")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  {!rule.managed || isProtected ? (
                    <span
                      className="flex h-7 w-7 items-center justify-center text-muted-foreground"
                      title={
                        !rule.managed
                          ? "Managed outside the panel — not deletable here"
                          : "Protects SSH/panel access — cannot be removed"
                      }
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(rule)}
                      aria-label="Delete rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
