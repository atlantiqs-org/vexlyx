"use client";

import { useEffect, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackupSettings } from "@/hooks/useBackups";

/**
 * Editable schedule + retention policy. A change here re-schedules the
 * BullMQ daily backup job immediately — no redeploy needed.
 */
export function BackupSettingsCard() {
  const { settings, isLoading, updateSettings, isSaving } = useBackupSettings();

  const [scheduleCron, setScheduleCron] = useState("");
  const [retentionDaily, setRetentionDaily] = useState(7);
  const [retentionWeekly, setRetentionWeekly] = useState(4);

  useEffect(() => {
    if (settings) {
      setScheduleCron(settings.scheduleCron);
      setRetentionDaily(settings.retentionDaily);
      setRetentionWeekly(settings.retentionWeekly);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings({ scheduleCron, retentionDaily, retentionWeekly });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          Schedule &amp; Retention
        </CardTitle>
        <CardDescription>
          Cron expression for the daily automated backup, and how many snapshots to keep.
        </CardDescription>
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
              <Label htmlFor="schedule-cron">Schedule (cron)</Label>
              <Input
                id="schedule-cron"
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
                placeholder="0 3 * * *"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Default: <code className="rounded bg-muted px-1 py-0.5">0 3 * * *</code> (daily at 3am)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="retention-daily">Keep daily</Label>
                <Input
                  id="retention-daily"
                  type="number"
                  min={1}
                  max={90}
                  value={retentionDaily}
                  onChange={(e) => setRetentionDaily(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="retention-weekly">Keep weekly</Label>
                <Input
                  id="retention-weekly"
                  type="number"
                  min={0}
                  max={52}
                  value={retentionWeekly}
                  onChange={(e) => setRetentionWeekly(Number(e.target.value))}
                />
              </div>
            </div>

            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
