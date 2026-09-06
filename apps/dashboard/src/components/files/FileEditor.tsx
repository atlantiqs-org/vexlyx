"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, AlertCircle } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { Button } from "@/components/ui/button";
import { fetchAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Language detection from file extension
// ---------------------------------------------------------------------------

function getExtensions(extension?: string) {
  switch (extension?.toLowerCase()) {
    case "js":
    case "mjs":
    case "cjs":
      return [javascript()];
    case "ts":
    case "tsx":
    case "jsx":
      return [javascript({ typescript: true, jsx: true })];
    case "css":
    case "scss":
    case "less":
      return [css()];
    case "html":
    case "htm":
    case "twig":
      return [html()];
    case "json":
      return [json()];
    case "yaml":
    case "yml":
      return [yaml()];
    case "md":
    case "mdx":
      return [markdown()];
    case "php":
      return [php()];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FileEditorProps {
  projectId: string;
  filePath: string;
  extension?: string;
  className?: string;
  onSaved?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileEditor({
  projectId,
  filePath,
  extension,
  className,
  onSaved,
}: FileEditorProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalRef = useRef("");

  // Load file content
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setIsDirty(false);

    fetchAPI<{ content: string }>(
      `/api/files/${projectId}/read?path=${encodeURIComponent(filePath)}`,
    )
      .then((res) => {
        setContent(res.content);
        originalRef.current = res.content;
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load file";
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [projectId, filePath]);

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && !isSaving) void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleChange = (value: string) => {
    setContent(value);
    setIsDirty(value !== originalRef.current);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetchAPI(`/api/files/${projectId}/write`, {
        method: "POST",
        body: JSON.stringify({ path: filePath, content }),
      });
      originalRef.current = content;
      setIsDirty(false);
      toast.success("File saved");
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save file";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const extensions = getExtensions(extension);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-card shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate max-w-xs">
            {filePath.split("/").pop()}
          </span>
          {isDirty && (
            <span className="h-2 w-2 rounded-full bg-amber-400" title="Unsaved changes" />
          )}
        </div>
        <Button
          id="file-editor-save-btn"
          size="sm"
          onClick={() => void handleSave()}
          disabled={!isDirty || isSaving}
          className="gap-1.5"
        >
          {isSaving
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Save className="h-3.5 w-3.5" />
          }
          Save
        </Button>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full gap-2 text-rose-500">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <CodeMirror
            value={content}
            height="100%"
            theme={oneDark}
            extensions={extensions}
            onChange={handleChange}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              autocompletion: true,
            }}
            style={{ height: "100%", fontSize: "13px", fontFamily: "'JetBrains Mono', 'Geist Mono', monospace" }}
          />
        )}
      </div>
    </div>
  );
}
