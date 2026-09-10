"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { FirewallPolicy, FirewallSettingsResponse } from "@vexlyx/shared";

interface DefaultPolicyCardProps {
  settings: FirewallSettingsResponse | undefined;
  isLoading: boolean;
  onSave: (input: { defaultIncoming: FirewallPolicy; defaultOutgoing: FirewallPolicy }) => Promise<void>;
  isSaving: boolean;
}

export function DefaultPolicyCard({ settings, isLoading, onSave, isSaving }: DefaultPolicyCardProps) {
  const [pending, setPending] = useState<{ defaultIncoming: FirewallPolicy; defaultOutgoing: FirewallPolicy } | null>(
    null,
  );
  const [defaultIncoming, setDefaultIncoming] = useState<FirewallPolicy>("DENY");
  const [defaultOutgoing, setDefaultOutgoing] = useState<FirewallPolicy>("ALLOW");

  useEffect(() => {
    if (settings) {
      setDefaultIncoming(settings.defaultIncoming);
      setDefaultOutgoing(settings.defaultOutgoing);
    }
  }, [settings]);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Default Policy
          </CardTitle>
          <CardDescription>Applies to any traffic not matched by an explicit rule above.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="default-incoming">Incoming</Label>
                <Select
                  value={defaultIncoming}
                  onValueChange={(v: FirewallPolicy) => setDefaultIncoming(v)}
                >
                  <SelectTrigger id="default-incoming">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DENY">Deny</SelectItem>
                    <SelectItem value="ALLOW">Allow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="default-outgoing">Outgoing</Label>
                <Select
                  value={defaultOutgoing}
                  onValueChange={(v: FirewallPolicy) => setDefaultOutgoing(v)}
                >
                  <SelectTrigger id="default-outgoing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLOW">Allow</SelectItem>
                    <SelectItem value="DENY">Deny</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                disabled={
                  isSaving ||
                  (settings?.defaultIncoming === defaultIncoming && settings?.defaultOutgoing === defaultOutgoing)
                }
                onClick={() => setPending({ defaultIncoming, defaultOutgoing })}
              >
                Save Policy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change default firewall policy?</DialogTitle>
            <DialogDescription>
              This applies immediately to the live firewall and affects every port without an explicit rule.
              Changes that would lock out SSH or panel access are refused automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPending(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSaving}
              onClick={async () => {
                if (!pending) return;
                try {
                  await onSave(pending);
                  setPending(null);
                } catch {
                  // Error toast already surfaced by useFirewall; keep the dialog open so the user can retry.
                }
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
