"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Lock,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileCode,
  Upload,
  Download,
  Loader2,
  Search,
  KeyRound,
  AlertCircle,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEnvVars } from "@/hooks/useEnvVars";
import { EnvVarKeySchema } from "@vexlyx/shared";
import type { EnvVar } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EnvVarEditorProps {
  projectId: string;
  onDeployTrigger?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnvVarEditor({ projectId, onDeployTrigger }: EnvVarEditorProps) {
  const {
    variables,
    isLoading,
    isSaving,
    upsertVar,
    importDotEnv,
    deleteVar,
    revealVar,
    refetch,
  } = useEnvVars(projectId);

  // New variable form state
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(true);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Revealed values cache: { [key: string]: string }
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [revealingKeys, setRevealingKeys] = useState<Record<string, boolean>>({});

  // Copied states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<{ key: string; value: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editIsSecret, setEditIsSecret] = useState(true);
  const [isLoadingEditValue, setIsLoadingEditValue] = useState(false);

  // Import modal state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importContent, setImportContent] = useState("");
  const [importOverwrite, setImportOverwrite] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filtered list
  const filteredVariables = useMemo(() => {
    if (!searchQuery.trim()) return variables;
    const q = searchQuery.toLowerCase();
    return variables.filter((v) => v.key.toLowerCase().includes(q));
  }, [variables, searchQuery]);

  // Handle Refresh with full spin animation
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Environment variables refreshed");
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Handle Redeploy Trigger
  const handleRedeploy = () => {
    if (onDeployTrigger) {
      onDeployTrigger();
    }
    const triggerBtn = document.getElementById("trigger-build-btn");
    if (triggerBtn) {
      triggerBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      (triggerBtn as HTMLButtonElement).click();
    } else {
      const buildPanel = document.getElementById("build-panel");
      if (buildPanel) {
        buildPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // Handle Key validation on blur / change
  const handleKeyChange = (val: string) => {
    setNewKey(val);
    if (!val) {
      setKeyError(null);
      return;
    }
    const result = EnvVarKeySchema.safeParse(val.trim());
    if (!result.success) {
      setKeyError(result.error.issues[0]?.message ?? "Invalid key format");
    } else {
      setKeyError(null);
    }
  };

  // Add new variable handler
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKey.trim();
    const cleanVal = newValue;

    const result = EnvVarKeySchema.safeParse(cleanKey);
    if (!result.success) {
      setKeyError(result.error.issues[0]?.message ?? "Invalid key format");
      return;
    }

    const saved = await upsertVar(cleanKey, cleanVal);
    if (saved) {
      setNewKey("");
      setNewValue("");
      setKeyError(null);
    }
  };

  // Toggle reveal state for a variable
  const handleToggleReveal = async (key: string) => {
    if (revealedValues[key] !== undefined) {
      // Hide
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    // Reveal from server
    setRevealingKeys((prev) => ({ ...prev, [key]: true }));
    const val = await revealVar(key);
    setRevealingKeys((prev) => ({ ...prev, [key]: false }));

    if (val !== null) {
      setRevealedValues((prev) => ({ ...prev, [key]: val }));
    }
  };

  // Copy value or key to clipboard
  const handleCopy = async (text: string, identifier: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Copy decrypted value
  const handleCopyValue = async (key: string) => {
    let val = revealedValues[key];
    if (val === undefined) {
      val = (await revealVar(key)) ?? "";
    }
    if (val) {
      await handleCopy(val, `val-${key}`);
      toast.success(`Copied value for "${key}"`);
    }
  };

  // Open Edit Modal and load value
  const handleOpenEdit = async (v: EnvVar) => {
    setEditTarget({ key: v.key, value: "" });
    setIsLoadingEditValue(true);
    let val = revealedValues[v.key];
    if (val === undefined) {
      val = (await revealVar(v.key)) ?? "";
    }
    setEditValue(val);
    setEditIsSecret(true);
    setIsLoadingEditValue(false);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const saved = await upsertVar(editTarget.key, editValue);
    if (saved) {
      // Update revealed cache if it was revealed
      if (revealedValues[editTarget.key] !== undefined) {
        setRevealedValues((prev) => ({ ...prev, [editTarget.key]: editValue }));
      }
      setEditTarget(null);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteVar(deleteTarget);
    if (success) {
      setDeleteTarget(null);
    }
  };

  // Import .env handler
  const handleImportSubmit = async () => {
    if (!importContent.trim()) {
      toast.error(".env content cannot be empty");
      return;
    }
    const count = await importDotEnv(importContent, importOverwrite);
    if (count !== null) {
      setImportDialogOpen(false);
      setImportContent("");
      setRevealedValues({});
    }
  };

  // Export all env vars as .env file
  const handleExport = async () => {
    if (variables.length === 0) {
      toast.info("No variables to export");
      return;
    }
    setIsExporting(true);
    try {
      const lines: string[] = [];
      for (const v of variables) {
        const val = (await revealVar(v.key)) ?? "";
        // If value contains spaces, quotes, or newlines, quote it
        if (/[\s"'#\n]/.test(val)) {
          lines.push(`${v.key}="${val.replace(/"/g, '\\"')}"`);
        } else {
          lines.push(`${v.key}=${val}`);
        }
      }
      const rawText = lines.join("\n") + "\n";

      // Download file
      const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `.env.${projectId.slice(0, 8)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Exported .env file");
    } catch {
      toast.error("Failed to export variables");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <KeyRound className="h-4 w-4 text-indigo-500" />
              Environment Variables
              <Badge variant="secondary" className="ml-1 text-xs font-normal">
                {variables.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Variables are encrypted at rest with AES-256-GCM and injected into containers on deployment.
            </CardDescription>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              Import .env
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => void handleExport()}
              disabled={isExporting || variables.length === 0}
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export
            </Button>
            <Button
              id="refresh-env-vars-btn"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => void handleRefresh()}
              disabled={isLoading || isRefreshing}
              title="Refresh variables"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-500",
                  (isLoading || isRefreshing) && "animate-spin text-indigo-500",
                )}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add New Variable Form */}
        <form onSubmit={handleAdd} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Add New Variable
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            {/* Key input */}
            <div className="sm:col-span-4 space-y-1">
              <Input
                id="env-var-new-key"
                placeholder="KEY_NAME"
                value={newKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                className={cn(
                  "h-9 font-mono text-xs uppercase placeholder:normal-case",
                  keyError && "border-rose-500 focus-visible:ring-rose-500",
                )}
                disabled={isSaving}
              />
              {keyError && <p className="text-[11px] text-rose-500">{keyError}</p>}
            </div>

            {/* Value input */}
            <div className="sm:col-span-6 relative">
              <Input
                id="env-var-new-value"
                type={newIsSecret ? "password" : "text"}
                placeholder="Value..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="h-9 font-mono text-xs pr-9"
                disabled={isSaving}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setNewIsSecret(!newIsSecret)}
                aria-label={newIsSecret ? "Show value" : "Hide value"}
              >
                {newIsSecret ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Submit button */}
            <div className="sm:col-span-2">
              <Button
                id="env-var-add-btn"
                type="submit"
                size="sm"
                className="h-9 w-full gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSaving || !newKey.trim() || !!keyError}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </Button>
            </div>
          </div>
        </form>

        {/* Variables List */}
        <div className="space-y-3">
          {/* Search bar */}
          {variables.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search variables by key…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs font-mono"
              />
            </div>
          )}

          {/* Table / List */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md border border-border">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-7 w-20" />
                </div>
              ))}
            </div>
          ) : variables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/20">
              <Lock className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">No environment variables yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Add keys like <code className="text-xs bg-muted px-1 py-0.5 rounded">DATABASE_URL</code> or import your <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file above.
              </p>
            </div>
          ) : filteredVariables.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No environment variables match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {filteredVariables.map((v) => {
                const isRevealed = revealedValues[v.key] !== undefined;
                const isRevealing = revealingKeys[v.key] === true;
                const displayVal = isRevealed ? revealedValues[v.key] : v.maskedValue;

                return (
                  <div
                    key={v.id}
                    className="flex flex-col gap-2 p-3 text-xs sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Key */}
                    <div className="flex items-center gap-2 min-w-0 sm:w-1/3">
                      <code className="font-mono font-medium text-indigo-600 dark:text-indigo-400 truncate">
                        {v.key}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => void handleCopy(v.key, `key-${v.key}`)}
                        title="Copy key"
                      >
                        {copiedKey === `key-${v.key}` ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Value */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 sm:px-4">
                      <span className="font-mono text-muted-foreground truncate select-all">
                        {displayVal}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                      {/* Reveal Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => void handleToggleReveal(v.key)}
                        title={isRevealed ? "Mask value" : "Reveal value"}
                        disabled={isRevealing}
                      >
                        {isRevealing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isRevealed ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>

                      {/* Copy Value */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => void handleCopyValue(v.key)}
                        title="Copy value"
                      >
                        {copiedKey === `val-${v.key}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>

                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => void handleOpenEdit(v)}
                        title="Edit variable"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(v.key)}
                        title="Delete variable"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Redeploy notice */}
        {variables.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Environment variable changes take effect on your next deployment.</span>
            </div>
            <Button
              id="env-var-redeploy-btn"
              variant="outline"
              size="sm"
              className="h-7 border-amber-500/30 text-xs font-medium shrink-0 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              onClick={handleRedeploy}
            >
              Redeploy Now
            </Button>
          </div>
        )}
      </CardContent>

      {/* Edit Variable Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit &ldquo;{editTarget?.key}&rdquo;</DialogTitle>
            <DialogDescription>
              Update the value for this environment variable. It will be re-encrypted at rest.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Variable Key</Label>
              <Input
                value={editTarget?.key ?? ""}
                disabled
                className="h-9 font-mono text-xs bg-muted"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Variable Value</Label>
                <button
                  type="button"
                  onClick={() => setEditIsSecret(!editIsSecret)}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {editIsSecret ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {editIsSecret ? "Show" : "Hide"}
                </button>
              </div>

              {isLoadingEditValue ? (
                <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading existing value…
                </div>
              ) : (
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter variable value…"
                  className="font-mono text-xs min-h-[100px]"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTarget(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSaveEdit()}
              disabled={isSaving || isLoadingEditValue}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget}&rdquo;?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this environment variable? It will no longer be injected on future deployments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleConfirmDelete()}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Delete Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import .env Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-indigo-500" />
              Import .env File
            </DialogTitle>
            <DialogDescription>
              Paste the contents of your <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file below. Comments (#) and blank lines will be ignored.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder={`# Example .env\nDATABASE_URL="postgres://user:pass@localhost:5432/db"\nPORT=3000\nNODE_ENV=production\nAPI_KEY=sk_live_123456789`}
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              className="font-mono text-xs min-h-[180px] bg-slate-950 text-slate-100 placeholder:text-slate-500"
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                id="overwrite-checkbox"
                type="checkbox"
                checked={importOverwrite}
                onChange={(e) => setImportOverwrite(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="overwrite-checkbox" className="text-xs cursor-pointer font-normal">
                Overwrite existing variables (replaces all variables currently stored)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleImportSubmit()}
              disabled={isSaving || !importContent.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Import Variables
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
