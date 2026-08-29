"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  GitBranch,
  KeyRound,
  Link2,
  Loader2,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useGitSettings } from "@/hooks/useGitSettings";
import { ConnectRepoSchema } from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Small copy-to-clipboard button
// ---------------------------------------------------------------------------

function CopyButton({ value, id }: { value: string; id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      id={id}
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={() => void handleCopy()}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Git URL + branch form validation
// ---------------------------------------------------------------------------

interface FormState {
  gitUrl: string;
  branch: string;
}

interface FormErrors {
  gitUrl?: string;
  branch?: string;
}

function validateGitForm(form: FormState): FormErrors {
  const result = ConnectRepoSchema.safeParse({ gitUrl: form.gitUrl, branch: form.branch });
  if (result.success) return {};
  const errors: FormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FormErrors;
    if (field === "gitUrl" || field === "branch") {
      errors[field] = issue.message;
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GitSettingsProps {
  projectId: string;
  /** Initial gitUrl from the parent project record, if any */
  initialGitUrl?: string | null;
  /** Initial branch from the parent project record */
  initialBranch?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GitSettings({
  projectId,
  initialGitUrl,
  initialBranch = "main",
}: GitSettingsProps) {
  const { state, fetchMetadata, connectRepo, generateSshKey } =
    useGitSettings(projectId);

  const [form, setForm] = useState<FormState>({
    gitUrl: initialGitUrl ?? "",
    branch: initialBranch,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Fetch git metadata on mount so SSH key + webhook URL are populated.
  useEffect(() => {
    void fetchMetadata();
  }, [fetchMetadata]);

  // Sync form with fetched metadata (e.g. after a successful connect).
  useEffect(() => {
    if (state.data?.gitUrl) {
      setForm((prev) => ({
        gitUrl: state.data!.gitUrl ?? prev.gitUrl,
        branch: state.data!.branch ?? prev.branch,
      }));
    }
  }, [state.data]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateGitForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    setIsConnecting(true);
    try {
      await connectRepo({
        gitUrl: form.gitUrl.trim(),
        branch: form.branch.trim() || "main",
        isPrivate: state.data?.isPrivate ?? false,
      });
      toast.success("Repository connected successfully");
    } catch {
      toast.error("Failed to connect repository");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    try {
      await generateSshKey();
      toast.success("SSH key generated — copy the public key to your repo's Deploy Keys");
    } catch {
      toast.error("Failed to generate SSH key");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const metadata = state.data;

  return (
    <div className="space-y-4">
      {/* ── Section A: Repository connection ── */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" />
            Repository
          </CardTitle>
          <CardDescription className="text-xs">
            Connect a GitHub, GitLab, or Bitbucket repository to this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id={`git-connect-form-${projectId}`}
            onSubmit={(e) => void handleConnect(e)}
            className="space-y-4"
          >
            {/* Git URL */}
            <div className="space-y-1.5">
              <Label htmlFor={`git-url-${projectId}`}>
                Git URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`git-url-${projectId}`}
                placeholder={metadata?.sshPublicKey ? "git@github.com:user/repo.git" : "https://github.com/user/repo"}
                value={form.gitUrl}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, gitUrl: e.target.value }));
                  if (errors.gitUrl) setErrors((prev) => ({ ...prev, gitUrl: undefined }));
                }}
                disabled={isConnecting}
                autoComplete="off"
                className={cn(errors.gitUrl && "border-destructive")}
              />
              {errors.gitUrl ? (
                <p className="text-xs text-destructive">{errors.gitUrl}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Use <strong>HTTPS</strong> (<code className="font-mono">https://github.com/...</code>) for public repos, or <strong>SSH</strong> (<code className="font-mono">git@github.com:...</code>) for private repos with Deploy Keys.
                </p>
              )}
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label htmlFor={`git-branch-${projectId}`}>Branch</Label>
              <Input
                id={`git-branch-${projectId}`}
                placeholder="main"
                value={form.branch}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, branch: e.target.value }));
                  if (errors.branch) setErrors((prev) => ({ ...prev, branch: undefined }));
                }}
                disabled={isConnecting}
                autoComplete="off"
                className={cn(errors.branch && "border-destructive")}
              />
              {errors.branch && (
                <p className="text-xs text-destructive">{errors.branch}</p>
              )}
            </div>

            <Button
              id={`git-connect-btn-${projectId}`}
              type="submit"
              size="sm"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitBranch className="mr-2 h-3.5 w-3.5" />
              )}
              {metadata?.gitUrl ? "Reconnect Repository" : "Connect Repository"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Section B: SSH Deploy Key ── */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            SSH Deploy Key
          </CardTitle>
          <CardDescription className="text-xs">
            For private repositories. Generate a key and add the public key to your repo&rsquo;s
            Deploy Keys (Settings → Deploy Keys).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            id={`git-keygen-btn-${projectId}`}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleGenerateKey()}
            disabled={isGeneratingKey}
          >
            {isGeneratingKey ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            {metadata?.sshPublicKey ? "Regenerate SSH Key" : "Generate SSH Key"}
          </Button>

          {metadata?.sshPublicKey && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Public Key</Label>
                <CopyButton
                  id={`copy-ssh-key-${projectId}`}
                  value={metadata.sshPublicKey}
                />
              </div>
              <Textarea
                readOnly
                value={metadata.sshPublicKey}
                rows={3}
                className="resize-none font-mono text-xs text-muted-foreground"
                aria-label="SSH public key"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section C: Webhook URL (only once repo is connected) ── */}
      {metadata?.webhookUrl && (
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Webhook URL
            </CardTitle>
            <CardDescription className="text-xs">
              Add this URL to your repository&rsquo;s Webhooks (Settings → Webhooks) to enable
              automatic deployments on push.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                id={`webhook-url-${projectId}`}
                readOnly
                value={metadata.webhookUrl}
                className="font-mono text-xs text-muted-foreground"
                aria-label="Webhook URL"
              />
              <CopyButton
                id={`copy-webhook-url-${projectId}`}
                value={metadata.webhookUrl}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Set content type to <code className="font-mono">application/json</code> and
              select <strong>push</strong> events only.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading / error state */}
      {state.isLoading && !metadata && (
        <p className="text-xs text-muted-foreground">Loading git settings…</p>
      )}
      {state.error && !state.isLoading && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      <Separator />
    </div>
  );
}
