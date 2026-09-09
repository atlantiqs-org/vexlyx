"use client";

import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TriggerBackupButtonProps {
  onTrigger: () => void;
  isTriggering: boolean;
}

/**
 * Manual backup trigger. Spinner feedback follows CLAUDE.md's
 * refresh-button convention (isTriggering-driven, ~500ms animate-spin).
 */
export function TriggerBackupButton({ onTrigger, isTriggering }: TriggerBackupButtonProps) {
  return (
    <Button onClick={onTrigger} disabled={isTriggering} size="sm" className="gap-1.5">
      {isTriggering ? (
        <Loader2 className={cn("h-3.5 w-3.5 animate-spin")} />
      ) : (
        <PlayCircle className="h-3.5 w-3.5" />
      )}
      Backup Now
    </Button>
  );
}
