"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadDropzoneProps {
  projectId: string;
  targetPath: string;
  onUploadComplete?: () => void;
  className?: string;
}

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UploadDropzone({
  projectId,
  targetPath,
  onUploadComplete,
  className,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: File[]) => {
    const oversized = files.filter((f) => f.size > MAX_BYTES);
    if (oversized.length > 0) {
      toast.error(`${oversized.map((f) => f.name).join(", ")} exceeds 100 MB limit`);
    }

    const valid = files.filter((f) => f.size <= MAX_BYTES);
    if (valid.length === 0) return;

    for (const file of valid) {
      const form = new FormData();
      form.append("path", targetPath);
      form.append("file", file, file.name);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/files/${projectId}/upload`,
          {
            method: "POST",
            credentials: "include",
            body: form,
          },
        );
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Upload failed");
        }
        toast.success(`${file.name} uploaded`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast.error(`${file.name}: ${msg}`);
      }
    }

    onUploadComplete?.();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    void uploadFiles(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    void uploadFiles(files);
    e.target.value = "";
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed border-border rounded-lg p-6 text-center",
        "hover:border-primary/50 transition-colors cursor-pointer",
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      aria-label="Upload files"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        aria-label="File upload input"
      />
      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-foreground font-medium">Drop files here or click to upload</p>
      <p className="text-xs text-muted-foreground mt-1">Max 100 MB per file</p>
    </div>
  );
}
