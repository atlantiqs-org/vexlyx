"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreateFirewallRuleInput, FirewallAction, FirewallProtocol } from "@vexlyx/shared";

interface AddRuleDialogProps {
  onAdd: (input: CreateFirewallRuleInput) => Promise<void>;
  isAdding: boolean;
}

const DEFAULTS = { port: "", protocol: "TCP" as FirewallProtocol, action: "ALLOW" as FirewallAction, source: "", comment: "" };

export function AddRuleDialog({ onAdd, isAdding }: AddRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(DEFAULTS);

  const handleSubmit = async () => {
    const port = Number(form.port);
    if (!port || port < 1 || port > 65535) return;

    try {
      await onAdd({
        port,
        protocol: form.protocol,
        action: form.action,
        source: form.source.trim() || undefined,
        comment: form.comment.trim() || undefined,
      });
      setForm(DEFAULTS);
      setOpen(false);
    } catch {
      // Error toast already surfaced by useFirewall; keep the dialog open so the user can adjust and retry.
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add firewall rule</DialogTitle>
          <DialogDescription>
            This applies immediately to the live firewall. Rules that would lock out SSH or panel access are
            refused automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rule-port">Port</Label>
              <Input
                id="rule-port"
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                placeholder="8080"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-protocol">Protocol</Label>
              <Select value={form.protocol} onValueChange={(v: FirewallProtocol) => setForm((f) => ({ ...f, protocol: v }))}>
                <SelectTrigger id="rule-protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TCP">TCP</SelectItem>
                  <SelectItem value="UDP">UDP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-action">Action</Label>
            <Select value={form.action} onValueChange={(v: FirewallAction) => setForm((f) => ({ ...f, action: v }))}>
              <SelectTrigger id="rule-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALLOW">Allow</SelectItem>
                <SelectItem value="DENY">Deny</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-source">Source (optional)</Label>
            <Input
              id="rule-source"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="203.0.113.0/24 — leave blank for anywhere"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-comment">Comment (optional)</Label>
            <Input
              id="rule-comment"
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="e.g. Custom app port"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isAdding || !form.port}>
            {isAdding && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Add Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
