"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Terminal,
  RefreshCw,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  RotateCcw,
  KeyRound,
  ShieldOff,
  ShieldCheck,
  Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRefreshAnimation, refreshIconClassName } from "@/hooks/useRefreshAnimation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SftpCredentials {
  linuxUsername: string;
  password: string | null;
  host: string;
  port: number;
  sshPublicKeys: string[];
  isEnabled: boolean;
}

interface SftpPanelProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SftpPanel({ projectId: _ }: SftpPanelProps) {
  const [credentials, setCredentials] = useState<SftpCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isRefreshing, refresh } = useRefreshAnimation();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [newPublicKey, setNewPublicKey] = useState("");

  const loadCredentialsInternal = useCallback(async (isManual = false) => {
    if (!isManual) setIsLoading(true);
    try {
      const data = await fetchAPI<SftpCredentials>("/api/sftp/credentials");
      setCredentials(data);
    } catch {
      setCredentials(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCredentials = useCallback(
    (isManual = false) => {
      if (isManual) return refresh(() => loadCredentialsInternal(true));
      return loadCredentialsInternal(false);
    },
    [loadCredentialsInternal, refresh],
  );

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  const handleProvision = async () => {
    setIsProvisioning(true);
    try {
      const data = await fetchAPI<SftpCredentials & { password: string }>(
        "/api/sftp/provision",
        { method: "POST", body: JSON.stringify({}) },
      );
      setCredentials(data as unknown as SftpCredentials);
      setShowPassword(true);
      toast.success("SFTP access provisioned! Save your password — it won't be shown again in full.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to provision SFTP");
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      const data = await fetchAPI<{ password: string }>(
        "/api/sftp/rotate-password",
        { method: "POST", body: JSON.stringify({}) },
      );
      setCredentials((prev) => prev ? { ...prev, password: data.password } : null);
      setShowPassword(true);
      setRotateOpen(false);
      toast.success("Password rotated. Save your new password.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate password");
    } finally {
      setIsRotating(false);
    }
  };

  const handleAddKey = async () => {
    if (!newPublicKey.trim()) return;
    setIsAddingKey(true);
    try {
      await fetchAPI("/api/sftp/add-ssh-key", {
        method: "POST",
        body: JSON.stringify({ publicKey: newPublicKey.trim() }),
      });
      setCredentials((prev) =>
        prev ? { ...prev, sshPublicKeys: [...prev.sshPublicKeys, newPublicKey.trim()] } : null,
      );
      setNewPublicKey("");
      toast.success("SSH public key added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add SSH key");
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleDisable = async () => {
    setIsDisabling(true);
    try {
      await fetchAPI("/api/sftp/disable", { method: "DELETE" });
      setCredentials((prev) => prev ? { ...prev, isEnabled: false } : null);
      setDisableOpen(false);
      toast.success("SFTP access disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disable SFTP");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      await fetchAPI("/api/sftp/enable", { method: "POST" });
      setCredentials((prev) => prev ? { ...prev, isEnabled: true } : null);
      toast.success("SFTP access enabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable SFTP");
    } finally {
      setIsEnabling(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

  const displayHost =
    credentials?.host && credentials.host !== "your-server-ip" && credentials.host !== "0.0.0.0"
      ? credentials.host
      : typeof window !== "undefined" && window.location.hostname
        ? window.location.hostname
        : "localhost";

  const connectionString = credentials
    ? `sftp -P ${credentials.port} ${credentials.linuxUsername}@${displayHost}`
    : "";

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">SFTP Access</CardTitle>
            {credentials && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  credentials.isEnabled
                    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "border-slate-500/30 text-slate-500 bg-slate-500/10",
                )}
              >
                {credentials.isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => void loadCredentials(true)}
            aria-label="Refresh SFTP credentials"
          >
            <RefreshCw className={refreshIconClassName(isRefreshing, "h-3.5 w-3.5")} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          One SFTP account per Vexlyx user · chrooted to all your project directories
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !credentials ? (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No SFTP account provisioned yet. Create one to get SSH file access.
            </p>
            <Button
              id="sftp-provision-btn"
              onClick={() => void handleProvision()}
              disabled={isProvisioning}
              className="gap-2"
            >
              {isProvisioning
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Plug className="h-4 w-4" />
              }
              Provision SFTP Access
            </Button>
          </div>
        ) : (
          <>
            {/* Disabled warning banner */}
            {!credentials.isEnabled && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldOff className="h-4 w-4 shrink-0" />
                  <span>SFTP access is currently disabled. Connections will be rejected.</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20 shrink-0 gap-1.5 font-medium"
                  onClick={() => void handleEnable()}
                  disabled={isEnabling}
                >
                  {isEnabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                  Enable SFTP
                </Button>
              </div>
            )}

            {/* Connection string */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Connection Command</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-slate-950 text-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-mono overflow-x-auto">
                  {connectionString}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(connectionString, "Connection command")}
                  aria-label="Copy connection command"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Host, Port, Username */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Host</Label>
                <div className="flex items-center gap-1">
                  <Input
                    readOnly
                    value={displayHost}
                    className="text-xs font-mono h-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(displayHost, "Host")}
                    aria-label="Copy host"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Port</Label>
                <div className="flex items-center gap-1">
                  <Input
                    readOnly
                    value={credentials.port}
                    className="text-xs font-mono h-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(String(credentials.port), "Port")}
                    aria-label="Copy port"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Username</Label>
                <div className="flex items-center gap-1">
                  <Input
                    readOnly
                    value={credentials.linuxUsername}
                    className="text-xs font-mono h-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(credentials.linuxUsername, "Username")}
                    aria-label="Copy username"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Password */}
            {credentials.password && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <div className="flex items-center gap-1">
                  <Input
                    readOnly
                    type={showPassword ? "text" : "password"}
                    value={credentials.password}
                    className="text-xs font-mono h-8 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(credentials.password ?? "", "Password")}
                    aria-label="Copy password"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* SSH Keys */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">SSH Public Key (optional)</Label>
              <Textarea
                id="sftp-ssh-key-input"
                placeholder="ssh-ed25519 AAAA... user@host"
                value={newPublicKey}
                onChange={(e) => setNewPublicKey(e.target.value)}
                className="text-xs font-mono h-20 resize-none"
              />
              <Button
                id="sftp-add-key-btn"
                variant="outline"
                size="sm"
                onClick={() => void handleAddKey()}
                disabled={isAddingKey || !newPublicKey.trim()}
                className="gap-2"
              >
                {isAddingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                Add SSH Key
              </Button>

              {credentials.sshPublicKeys.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-xs text-muted-foreground">{credentials.sshPublicKeys.length} key(s) registered</p>
                  {credentials.sshPublicKeys.map((key, i) => (
                    <code key={i} className="block text-xs text-muted-foreground truncate font-mono">
                      {key.slice(0, 60)}…
                    </code>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                id="sftp-rotate-btn"
                variant="outline"
                size="sm"
                onClick={() => setRotateOpen(true)}
                className="gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Rotate Password
              </Button>
              {credentials.isEnabled ? (
                <Button
                  id="sftp-disable-btn"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDisableOpen(true)}
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  Disable SFTP
                </Button>
              ) : (
                <Button
                  id="sftp-enable-btn"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => void handleEnable()}
                  disabled={isEnabling}
                >
                  {isEnabling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  Enable SFTP
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Rotate confirmation */}
      <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate SFTP Password?</DialogTitle>
            <DialogDescription>
              This will generate a new random password and invalidate the current one. Any active SFTP sessions will be disconnected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateOpen(false)} disabled={isRotating}>
              Cancel
            </Button>
            <Button onClick={() => void handleRotate()} disabled={isRotating}>
              {isRotating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rotate Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable confirmation */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable SFTP Access?</DialogTitle>
            <DialogDescription>
              This will lock the Linux account. You can re-provision later to restore access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)} disabled={isDisabling}>
              Cancel
            </Button>
            <Button
              id="confirm-disable-sftp-btn"
              variant="destructive"
              onClick={() => void handleDisable()}
              disabled={isDisabling}
            >
              {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable SFTP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
