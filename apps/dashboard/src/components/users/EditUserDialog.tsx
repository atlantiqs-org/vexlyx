"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role, UserResponse, UpdateUserQuotasInput } from "@vexlyx/shared";

interface EditUserDialogProps {
  user: UserResponse | null;
  isSaving: boolean;
  /** Only an ADMIN may change roles — a RESELLER editing their own sub-account never sees this field. */
  canEditRole: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: { role?: Role; quotas: UpdateUserQuotasInput }) => Promise<void>;
}

type QuotaField = "maxProjects" | "maxDomains" | "maxDatabases" | "maxMailboxes" | "maxSubAccounts";

const QUOTA_FIELDS: { key: QuotaField; label: string }[] = [
  { key: "maxProjects", label: "Max projects" },
  { key: "maxDomains", label: "Max domains" },
  { key: "maxDatabases", label: "Max databases" },
  { key: "maxMailboxes", label: "Max mailboxes" },
  { key: "maxSubAccounts", label: "Max sub-accounts" },
];

function toFormValue(v: number | null): string {
  return v === null ? "" : String(v);
}

function fromFormValue(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

export function EditUserDialog({ user, isSaving, canEditRole, onOpenChange, onSave }: EditUserDialogProps) {
  const [role, setRole] = useState<Role>("USER");
  const [quotas, setQuotas] = useState<Record<QuotaField, string>>({
    maxProjects: "",
    maxDomains: "",
    maxDatabases: "",
    maxMailboxes: "",
    maxSubAccounts: "",
  });

  useEffect(() => {
    if (!user) return;
    setRole(user.role);
    setQuotas({
      maxProjects: toFormValue(user.maxProjects),
      maxDomains: toFormValue(user.maxDomains),
      maxDatabases: toFormValue(user.maxDatabases),
      maxMailboxes: toFormValue(user.maxMailboxes),
      maxSubAccounts: toFormValue(user.maxSubAccounts),
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    await onSave(user.id, {
      role: canEditRole && role !== user.role ? role : undefined,
      quotas: {
        maxProjects: fromFormValue(quotas.maxProjects),
        maxDomains: fromFormValue(quotas.maxDomains),
        maxDatabases: fromFormValue(quotas.maxDatabases),
        maxMailboxes: fromFormValue(quotas.maxMailboxes),
        maxSubAccounts: fromFormValue(quotas.maxSubAccounts),
      },
    });
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            {canEditRole
              ? `Change ${user?.name}'s role and resource quotas. Leave a quota blank for unlimited.`
              : `Change ${user?.name}'s resource quotas. Leave a quota blank for unlimited.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {canEditRole && (
            <div className="space-y-1.5">
              <Label htmlFor="user-role">Role</Label>
              <Select value={role} onValueChange={(v: Role) => setRole(v)}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="RESELLER">Reseller</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {QUOTA_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`quota-${key}`}>{label}</Label>
                <Input
                  id={`quota-${key}`}
                  type="number"
                  min={0}
                  value={quotas[key]}
                  onChange={(e) => setQuotas((q) => ({ ...q, [key]: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
