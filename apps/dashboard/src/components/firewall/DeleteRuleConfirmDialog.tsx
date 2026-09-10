"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FirewallRuleResponse } from "@vexlyx/shared";

interface DeleteRuleConfirmDialogProps {
  rule: FirewallRuleResponse | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteRuleConfirmDialog({ rule, onOpenChange, onConfirm }: DeleteRuleConfirmDialogProps) {
  return (
    <Dialog open={!!rule} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this rule?</DialogTitle>
          <DialogDescription>
            {rule && (
              <>
                This will immediately {rule.action === "ALLOW" ? "close" : "unblock"} port {rule.port}/
                {rule.protocol.toLowerCase()}
                {rule.source ? ` for ${rule.source}` : ""} on the live firewall.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Remove Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
