"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderOpen, ExternalLink, RefreshCw, Loader2, File } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchAPI } from "@/lib/api";
import { useRefreshAnimation, refreshIconClassName } from "@/hooks/useRefreshAnimation";
import type { FileNode } from "@vexlyx/shared";

interface FileManagerCardProps {
  projectId: string;
}

export function FileManagerCard({ projectId }: FileManagerCardProps) {
  const [recentFiles, setRecentFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isRefreshing, refresh } = useRefreshAnimation();

  const loadFilesInternal = useCallback(async (isManual = false) => {
    if (!isManual) setIsLoading(true);

    try {
      const res = await fetchAPI<{ nodes: FileNode[] }>(
        `/api/files/${projectId}/list?path=&depth=2`,
      );
      // Flatten and sort by mtime, take top 5 files
      const allFiles: FileNode[] = [];
      const flatten = (nodes: FileNode[]) => {
        for (const n of nodes) {
          if (n.type === "file") allFiles.push(n);
          if (n.children) flatten(n.children);
        }
      };
      flatten(res.nodes);
      allFiles.sort((a, b) =>
        (b.mtime ?? "").localeCompare(a.mtime ?? ""),
      );
      setRecentFiles(allFiles.slice(0, 5));
    } catch {
      // Silently fail — project may not have files yet
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadFiles = useCallback(
    (isManual = false) => {
      if (isManual) return refresh(() => loadFilesInternal(true));
      return loadFilesInternal(false);
    },
    [loadFilesInternal, refresh],
  );

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">File Manager</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => void loadFiles(true)}
              aria-label="Refresh files"
            >
              <RefreshCw className={refreshIconClassName(isRefreshing, "h-3.5 w-3.5")} />
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 gap-1.5">
              <Link href={`/projects/${projectId}/files`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Open
              </Link>
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Recent files · click &ldquo;Open&rdquo; to manage in a new tab
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading files…
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No files found. Deploy your project or{" "}
            <Link
              href={`/projects/${projectId}/files`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              upload files
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-1">
            {recentFiles.map((file) => (
              <Link
                key={file.path}
                href={`/projects/${projectId}/files?open=${encodeURIComponent(file.path)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate text-foreground">{file.path}</span>
                {file.size !== undefined && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {file.size < 1024
                      ? `${file.size} B`
                      : file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
