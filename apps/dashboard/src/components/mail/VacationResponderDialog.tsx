"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Palmtree,
  Calendar,
  Clock,
  Mail,
  Loader2,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVacationResponder } from "@/hooks/useVacationResponder";
import { cn } from "@/lib/utils";
import type { MailboxResponse } from "@vexlyx/shared";

interface VacationResponderDialogProps {
  mailbox: MailboxResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const INTERVAL_PRESETS = [
  { value: "1", label: "1 day (Recommended)" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days (1 week)" },
  { value: "14", label: "14 days (2 weeks)" },
  { value: "30", label: "30 days (1 month)" },
];

export function VacationResponderDialog({
  mailbox,
  open,
  onOpenChange,
  onSuccess,
}: VacationResponderDialogProps) {
  const { responder, isLoading, isSaving, updateResponder } = useVacationResponder(
    mailbox?.id ?? null,
  );

  const [enabled, setEnabled] = useState(false);
  const [subject, setSubject] = useState("Out of office: Auto-reply");
  const [message, setMessage] = useState("");
  const [intervalDays, setIntervalDays] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sync form with loaded responder
  useEffect(() => {
    if (responder) {
      setEnabled(responder.enabled);
      setSubject(responder.subject || "Out of office: Auto-reply");
      setMessage(responder.message || "");
      setIntervalDays(String(responder.intervalDays || 1));
      setStartDate(responder.startDate ? responder.startDate.slice(0, 10) : "");
      setEndDate(responder.endDate ? responder.endDate.slice(0, 10) : "");
    }
  }, [responder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailbox) return;

    if (enabled && !message.trim()) {
      toast.error("Please provide an auto-reply message");
      return;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    try {
      await updateResponder(mailbox.id, {
        enabled,
        subject: subject.trim() || "Out of office: Auto-reply",
        message: message.trim(),
        intervalDays: parseInt(intervalDays, 10) || 1,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
      });

      toast.success(
        enabled
          ? `Vacation responder enabled for ${mailbox.address}`
          : `Vacation responder disabled for ${mailbox.address}`,
      );

      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save vacation responder settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Palmtree className="h-5 w-5 text-indigo-500" />
              Vacation Auto-Responder
            </DialogTitle>
            {responder?.enabled && (
              <Badge
                variant="outline"
                className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                Active
              </Badge>
            )}
          </div>
          <DialogDescription>
            Configure an automated out-of-office response for{" "}
            <span className="font-medium text-foreground">{mailbox?.address}</span>.
            Powered by Dovecot Pigeonhole Sieve.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-xs">
              <div className="space-y-0.5">
                <Label htmlFor="vacation-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                  Enable auto-responder
                </Label>
                <p className="text-xs text-muted-foreground">
                  Send automated replies to incoming emails during your absence
                </p>
              </div>
              <Switch
                id="vacation-toggle"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            <div className={cn("space-y-4 transition-opacity", !enabled && "opacity-60")}>
              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="vacation-subject" className="text-xs font-medium text-muted-foreground">
                  Auto-Reply Subject
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="vacation-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Out of office: Auto-reply"
                    className="pl-9 text-sm"
                    disabled={!enabled || isSaving}
                  />
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vacation-message" className="text-xs font-medium text-muted-foreground">
                    Response Message
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {message.length}/10000
                  </span>
                </div>
                <Textarea
                  id="vacation-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="I am currently away from the office with limited access to email. I will respond to your message as soon as possible upon my return."
                  rows={4}
                  className="resize-none text-sm"
                  disabled={!enabled || isSaving}
                />
              </div>

              {/* Repeat Interval */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vacation-interval" className="text-xs font-medium text-muted-foreground">
                    Repeat Rate-Limit Interval
                  </Label>
                  <span className="text-xs text-muted-foreground">Once per sender</span>
                </div>
                <Select
                  value={intervalDays}
                  onValueChange={setIntervalDays}
                  disabled={!enabled || isSaving}
                >
                  <SelectTrigger id="vacation-interval" className="w-full">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Senders will not receive another auto-reply until this period elapses.
                </p>
              </div>

              <Separator />

              {/* Optional Date Window */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Scheduled Date Range (Optional)
                  </Label>
                  {(startDate || endDate) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                    >
                      Clear dates
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                      Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={!enabled || isSaving}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                      End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={!enabled || isSaving}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-1.5 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    If blank, auto-replies remain active indefinitely until toggled off. Sieve checks date conditions dynamically on delivery.
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
