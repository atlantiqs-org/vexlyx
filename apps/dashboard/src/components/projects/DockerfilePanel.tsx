"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  FileCode,
  Upload,
  RefreshCw,
  Loader2,
  Zap,
  Layers,
  Sparkles,
  Info,
  Server,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRefreshAnimation, refreshIconClassName } from "@/hooks/useRefreshAnimation";
import type { Project, DockerfileStatus, DockerfileTemplate } from "@vexlyx/shared";

interface DockerfilePanelProps {
  project: Project;
  onProjectUpdate?: () => void;
  onDeployTrigger?: () => void;
}

export function DockerfilePanel({ project, onProjectUpdate, onDeployTrigger }: DockerfilePanelProps) {
  const [status, setStatus] = useState<DockerfileStatus | null>(null);
  const [templates, setTemplates] = useState<DockerfileTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<"dockerfile" | "dockerignore">("dockerfile");
  const [dockerfileContent, setDockerfileContent] = useState("");
  const [dockerignoreContent, setDockerignoreContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { isRefreshing, refresh } = useRefreshAnimation();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [portInput, setPortInput] = useState<string>(project.port?.toString() ?? "3000");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch status and templates
  const fetchDockerfileData = useCallback(async () => {
    try {
      const [statusData, templatesData] = await Promise.all([
        fetchAPI<DockerfileStatus>(`/api/projects/${project.id}/dockerfile`),
        fetchAPI<{ templates: DockerfileTemplate[] }>(`/api/projects/${project.id}/dockerfile/templates`),
      ]);

      setStatus(statusData);
      setDockerfileContent(statusData.dockerfile || "");
      setDockerignoreContent(statusData.dockerignore || "");
      setTemplates(templatesData.templates || []);

      if (statusData.exposedPorts && statusData.exposedPorts.length > 0) {
        setPortInput(statusData.exposedPorts[0].toString());
      }
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to load Dockerfile config";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void fetchDockerfileData();
  }, [fetchDockerfileData]);

  const handleRefresh = () => refresh(() => fetchDockerfileData());

  const handleApplyTemplate = (tmpl: DockerfileTemplate) => {
    setDockerfileContent(tmpl.dockerfile);
    setDockerignoreContent(tmpl.dockerignore);
    setPortInput(tmpl.defaultPort.toString());
    toast.success(`Loaded "${tmpl.name}" template`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (activeTab === "dockerfile") {
        setDockerfileContent(content);
        toast.success(`Uploaded ${file.name} to Dockerfile editor`);
      } else {
        setDockerignoreContent(content);
        toast.success(`Uploaded ${file.name} to .dockerignore editor`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSave = async (triggerDeploy = false) => {
    setIsSaving(true);
    if (triggerDeploy) setIsDeploying(true);

    try {
      const parsedPort = portInput ? parseInt(portInput, 10) : undefined;
      const res = await fetchAPI<{ message: string; status: DockerfileStatus }>(
        `/api/projects/${project.id}/dockerfile`,
        {
          method: "PUT",
          body: JSON.stringify({
            dockerfile: dockerfileContent,
            dockerignore: dockerignoreContent,
            syncPort: true,
            port: isNaN(parsedPort as number) ? undefined : parsedPort,
          }),
        },
      );

      setStatus(res.status);
      toast.success("Dockerfile configuration saved");
      if (onProjectUpdate) onProjectUpdate();

      if (triggerDeploy) {
        // Trigger a new build
        await fetchAPI(`/api/projects/${project.id}/build`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        toast.success("Deployment triggered with custom Dockerfile");
        if (onDeployTrigger) {
          onDeployTrigger();
        } else if (onProjectUpdate) {
          onProjectUpdate();
        }
      }
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Failed to save Dockerfile";
      toast.error(msg);
    } finally {
      setIsSaving(false);
      setIsDeploying(false);
    }
  };

  const linesCount = (activeTab === "dockerfile" ? dockerfileContent : dockerignoreContent)
    .split("\n").length;

  return (
    <Card className="border border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileCode className="h-4 w-4 text-indigo-500" />
                Dockerfile & Container Configuration
              </CardTitle>
              {status?.hasDockerfile ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs">
                  Not Configured
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Provide a custom Dockerfile for full control over runtime dependencies, multi-stage builds, and exposed ports.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing || isLoading}
              className="h-8 px-2.5 text-xs"
            >
              <RefreshCw className={refreshIconClassName(isRefreshing, "h-3.5 w-3.5 mr-1.5")} />
              Refresh
            </Button>

            {/* Template Selector */}
            <div className="w-36">
              <Select
                onValueChange={(val) => {
                  const tmpl = templates.find((t) => t.id === val);
                  if (tmpl) handleApplyTemplate(tmpl);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-500 shrink-0" />
                  <SelectValue placeholder="Templates" />
                </SelectTrigger>
                <SelectContent align="end" className="w-56">
                  {templates.map((tmpl) => (
                    <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs">
                      <div className="flex flex-col items-start py-0.5">
                        <span className="font-medium text-foreground">{tmpl.name}</span>
                        <span className="text-[10px] text-muted-foreground">{tmpl.category}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload File button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".dockerfile,Dockerfile,.dockerignore,text/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-2.5 text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Directives Banner */}
        {status?.hasDockerfile && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground block text-[10px] uppercase font-medium">Base Image</span>
                <span className="font-mono text-foreground">{status.baseImage || "Not specified"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <Server className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground block text-[10px] uppercase font-medium">Exposed Port(s)</span>
                <span className="font-mono text-foreground">
                  {status.exposedPorts?.length ? status.exposedPorts.join(", ") : "3000 (default)"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="truncate">
                <span className="text-muted-foreground block text-[10px] uppercase font-medium">Health Check</span>
                <span className="font-mono text-foreground truncate block">
                  {status.healthCheck || "HTTP Probe (Default)"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md">
            <button
              type="button"
              onClick={() => setActiveTab("dockerfile")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors",
                activeTab === "dockerfile"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Dockerfile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dockerignore")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors",
                activeTab === "dockerignore"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              .dockerignore
            </button>
          </div>

          {/* Port input & sync */}
          <div className="flex items-center gap-2">
            <Label htmlFor="container-port" className="text-xs text-muted-foreground whitespace-nowrap">
              Container Port:
            </Label>
            <Input
              id="container-port"
              type="number"
              value={portInput}
              onChange={(e) => setPortInput(e.target.value)}
              placeholder="3000"
              className="h-7 w-20 text-xs font-mono text-center"
            />
          </div>
        </div>

        {/* Code Editor */}
        <div className="relative rounded-lg border border-border bg-slate-950 text-slate-100 font-mono text-xs overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-indigo-400" />
              {activeTab === "dockerfile" ? "Dockerfile" : ".dockerignore"}
            </span>
            <span>{linesCount} lines</span>
          </div>

          <div className="flex min-h-[300px] max-h-[500px]">
            {/* Line numbers gutter */}
            <div className="py-3 px-2 bg-slate-900/60 border-r border-slate-850 select-none text-slate-600 text-right text-xs font-mono min-w-[2.5rem]">
              {Array.from({ length: Math.max(linesCount, 15) }).map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={activeTab === "dockerfile" ? dockerfileContent : dockerignoreContent}
              onChange={(e) => {
                if (activeTab === "dockerfile") {
                  setDockerfileContent(e.target.value);
                } else {
                  setDockerignoreContent(e.target.value);
                }
              }}
              placeholder={
                activeTab === "dockerfile"
                  ? "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nEXPOSE 3000\nCMD [\"npm\", \"start\"]"
                  : "node_modules\n.git\n.env\n"
              }
              spellCheck={false}
              className="w-full flex-1 p-3 bg-transparent text-slate-100 placeholder:text-slate-600 focus:outline-none resize-none leading-6 font-mono text-xs overflow-y-auto whitespace-pre tab-size-2"
              rows={15}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Changes will be applied on the next build.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSave(false)}
              disabled={isSaving || isDeploying}
              className="h-8 px-3 text-xs"
            >
              {isSaving && !isDeploying && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Dockerfile
            </Button>

            <Button
              size="sm"
              onClick={() => void handleSave(true)}
              disabled={isSaving || isDeploying}
              className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isDeploying ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save & Deploy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
