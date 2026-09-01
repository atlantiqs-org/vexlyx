"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Globe,
  Upload,
  RefreshCw,
  Loader2,
  Package,
  Palette,
  ExternalLink,
  Server,
  Database,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Project } from "@vexlyx/shared";

interface WordPressStatus {
  installed: boolean;
  coreVersion: string;
  plugins: string[];
  themes: string[];
}

interface WordPressPanelProps {
  project: Project;
  onProjectUpdate?: () => void;
}

export function WordPressPanel({ project, onProjectUpdate }: WordPressPanelProps) {
  const [status, setStatus] = useState<WordPressStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Form state for DB settings
  const [dbName, setDbName] = useState("wordpress");
  const [dbUser, setDbUser] = useState("root");
  const [dbPassword, setDbPassword] = useState("");
  const [dbHost, setDbHost] = useState("localhost:3306");
  const [dbPrefix, setDbPrefix] = useState("wp_");

  // Upload state
  const [uploadType, setUploadType] = useState<"plugin" | "theme">("plugin");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchAPI<WordPressStatus>(`/api/projects/${project.id}/wordpress/status`);
      setStatus(data);
    } catch {
      // Ignored if not yet installed or project newly created
    }
  }, [project.id]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatus();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const result = await fetchAPI<{ message: string; success: boolean }>(
        `/api/projects/${project.id}/wordpress/install`,
        {
          method: "POST",
          body: JSON.stringify({
            dbName,
            dbUser,
            dbPassword,
            dbHost,
            dbPrefix,
            downloadCore: true,
          }),
        },
      );
      toast.success(result.message || "WordPress installed successfully!");
      setInstallModalOpen(false);
      await fetchStatus();
      if (onProjectUpdate) onProjectUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to install WordPress");
    } finally {
      setIsInstalling(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      toast.error("Please upload a valid .zip archive");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(",")[1];
        if (!base64Data) throw new Error("Could not read file");

        const res = await fetchAPI<{ message: string }>(
          `/api/projects/${project.id}/wordpress/upload`,
          {
            method: "POST",
            body: JSON.stringify({
              assetType: uploadType,
              zipBase64: base64Data,
            }),
          },
        );

        toast.success(res.message);
        await fetchStatus();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload asset");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      toast.error("Error reading file");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const triggerUploadDialog = (type: "plugin" | "theme") => {
    setUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const siteUrl = project.deployedDomain
    ? `http://${project.deployedDomain}`
    : project.internalPort
    ? `http://localhost:${project.internalPort}`
    : null;

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Globe className="h-4 w-4 text-indigo-500" />
            WordPress Management
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Manage WordPress core scaffolding, database connection, plugins, and themes.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            aria-label="Refresh status"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          {siteUrl && (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <a href={`${siteUrl}/wp-admin`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                WP Admin
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">WordPress Core</span>
                {status?.installed ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs py-0"
                  >
                    Installed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs py-0"
                  >
                    Not Installed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status?.coreVersion && status.coreVersion !== "unknown"
                  ? `Version ${status.coreVersion}`
                  : "Latest Release"}
              </p>
            </div>
          </div>

          {!status?.installed ? (
            <Button
              id="wp-one-click-btn"
              size="sm"
              className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              onClick={() => setInstallModalOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              1-Click Install WordPress
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setInstallModalOpen(true)}
            >
              <Database className="h-3.5 w-3.5" />
              Reconfigure DB
            </Button>
          )}
        </div>

        {/* Hidden file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => void handleFileUpload(e)}
        />

        {/* Plugins & Themes sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plugins */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Plugins ({status?.plugins?.length ?? 0})
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={isUploading}
                onClick={() => triggerUploadDialog("plugin")}
              >
                {isUploading && uploadType === "plugin" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                Upload Plugin
              </Button>
            </div>

            {status?.plugins && status.plugins.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                {status.plugins.map((plugin) => (
                  <Badge key={plugin} variant="secondary" className="text-xs font-normal">
                    {plugin}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                No custom plugins installed yet.
              </p>
            )}
          </div>

          {/* Themes */}
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Themes ({status?.themes?.length ?? 0})
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={isUploading}
                onClick={() => triggerUploadDialog("theme")}
              >
                {isUploading && uploadType === "theme" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                Upload Theme
              </Button>
            </div>

            {status?.themes && status.themes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                {status.themes.map((theme) => (
                  <Badge key={theme} variant="secondary" className="text-xs font-normal">
                    {theme}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                No custom themes installed yet.
              </p>
            )}
          </div>
        </div>
      </CardContent>

      {/* 1-Click Install Dialog */}
      <Dialog open={installModalOpen} onOpenChange={setInstallModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              1-Click WordPress Setup
            </DialogTitle>
            <DialogDescription>
              Scaffold WordPress core files and auto-generate a secure wp-config.php with
              cryptographic salts and permalinks support.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wp-db-name" className="text-xs">Database Name</Label>
              <Input
                id="wp-db-name"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                placeholder="wordpress"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wp-db-user" className="text-xs">Database User</Label>
                <Input
                  id="wp-db-user"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  placeholder="root"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wp-db-pass" className="text-xs">Database Password</Label>
                <Input
                  id="wp-db-pass"
                  type="password"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wp-db-host" className="text-xs">Database Host</Label>
                <Input
                  id="wp-db-host"
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  placeholder="localhost:3306"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wp-db-prefix" className="text-xs">Table Prefix</Label>
                <Input
                  id="wp-db-prefix"
                  value={dbPrefix}
                  onChange={(e) => setDbPrefix(e.target.value)}
                  placeholder="wp_"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInstallModalOpen(false)}
              disabled={isInstalling}
            >
              Cancel
            </Button>
            <Button
              id="confirm-wp-install-btn"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => void handleInstall()}
              disabled={isInstalling}
            >
              {isInstalling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Install WordPress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
