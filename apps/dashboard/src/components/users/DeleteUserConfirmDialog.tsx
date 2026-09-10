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
import type { UserResponse } from "@vexlyx/shared";

interface DeleteUserConfirmDialogProps {
  user: UserResponse | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteUserConfirmDialog({ user, onOpenChange, onConfirm }: DeleteUserConfirmDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this user?</DialogTitle>
          <DialogDescription>
            {user && (
              <>
                This permanently deletes {user.name} ({user.email}) and all of their projects, domains, databases,
                and mailboxes.
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
            Delete User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
