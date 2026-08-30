"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, ClipboardCopy, Pause, Play, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LogLine } from "@/hooks/useLogs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyLine(text: string): "error" | "info" | "plain" {
  if (text.includes("[vexlyx:error]") || text.includes("[error]")) return "error";
  if (text.startsWith("[vexlyx]")) return "info";
  return "plain";
}

function lineClass(kind: "error" | "info" | "plain"): string {
  switch (kind) {
    case "error":
      return "text-rose-400";
    case "info":
      return "text-indigo-400";
    default:
      return "text-slate-300";
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type LogFilter = "all" | "stdout" | "stderr";

interface LogViewerProps {
  /** Log lines to display */
  lines: LogLine[];
  /** Label shown in the header bar */
  title?: string;
  /** Whether to show the live indicator dot */
  isLive?: boolean;
  /** Whether the socket is connected */
  isConnected?: boolean;
  /** Max height of the scroll area (Tailwind class) */
  maxHeightClass?: string;
  /** Additional className for the outer wrapper */
  className?: string;
  /** Called when the user clicks the clear button (if provided, clear button shown) */
  onClear?: () => void;
}

// ---------------------------------------------------------------------------
// LogViewer
// ---------------------------------------------------------------------------

export function LogViewer({
  lines,
  title = "Output",
  isLive = false,
  isConnected = false,
  maxHeightClass = "max-h-80",
  className,
  onClear,
}: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLPreElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [copied, setCopied] = useState(false);

  // Auto-scroll when new lines arrive, unless paused by user
  useEffect(() => {
    if (!isPaused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines, isPaused]);

  // Detect manual scroll-up → pause; scroll to bottom → resume
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsPaused(!atBottom);
  }, []);

  const handleCopyAll = useCallback(async () => {
    const text = lines.map((l) => l.text).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [lines]);

  const scrollToBottom = useCallback(() => {
    setIsPaused(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const filteredLines = lines.filter((l) => {
    if (filter === "all") return true;
    return l.stream === filter;
  });

  const stderrCount = lines.filter((l) => l.stream === "stderr" || classifyLine(l.text) === "error").length;

  return (
    <div
      className={cn("overflow-hidden rounded-md border border-slate-700", className)}
      role="region"
      aria-label={title}
    >
      {/* Header bar — always dark */}
      <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity
            className={cn(
              "h-3 w-3",
              isLive && isConnected
                ? "text-emerald-400 animate-pulse"
                : "text-slate-500",
            )}
          />
          <span className="font-mono text-xs text-slate-400">{title}</span>
          {isLive && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1 py-0 h-4 font-mono",
                isConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-600 text-slate-500",
              )}
            >
              {isConnected ? "live" : "disconnected"}
            </Badge>
          )}
          {stderrCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 h-4 border-rose-500/30 bg-rose-500/10 text-rose-400 font-mono"
            >
              {stderrCount} err
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Filter toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 text-slate-500 hover:text-slate-200",
              filter !== "all" && "text-indigo-400",
            )}
            aria-label="Toggle stderr filter"
            onClick={() => setFilter((f) => (f === "all" ? "stderr" : "all"))}
            title={filter === "all" ? "Show stderr only" : "Show all streams"}
          >
            <Filter className="h-3 w-3" />
          </Button>

          {/* Pause / resume */}
          {isPaused ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-amber-400 hover:text-amber-200"
              aria-label="Resume auto-scroll"
              onClick={scrollToBottom}
            >
              <Play className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-500 hover:text-slate-200"
              aria-label="Pause auto-scroll"
              onClick={() => setIsPaused(true)}
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}

          {/* Copy all */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-500 hover:text-slate-200"
            aria-label="Copy all log output"
            onClick={() => void handleCopyAll()}
          >
            <ClipboardCopy className={cn("h-3 w-3", copied && "text-emerald-400")} />
          </Button>

          {/* Clear (optional) */}
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-500 hover:text-rose-400"
              aria-label="Clear logs"
              onClick={onClear}
            >
              <span className="font-mono text-[10px]">clr</span>
            </Button>
          )}

          {/* Line count */}
          <span className="font-mono text-[10px] text-slate-600 min-w-[3rem] text-right">
            {filteredLines.length} lines
          </span>
        </div>
      </div>

      {/* Log body */}
      <pre
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "overflow-y-auto bg-slate-950 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all",
          maxHeightClass,
        )}
        role="log"
        aria-live={isLive ? "polite" : "off"}
        aria-atomic="false"
      >
        {filteredLines.length === 0 ? (
          <span className="text-slate-600">
            {isLive && isConnected ? "Waiting for logs…" : "No output yet."}
          </span>
        ) : (
          filteredLines.map((l, i) => {
            const kind = l.stream === "stderr" ? "error" : classifyLine(l.text);
            return (
              <span key={i} className={cn("block", lineClass(kind))}>
                {l.text}
              </span>
            );
          })
        )}
        <div ref={bottomRef} />
      </pre>

      {/* Paused indicator */}
      {isPaused && (
        <div
          className="flex items-center justify-center gap-1.5 bg-slate-900 py-1 border-t border-slate-700 cursor-pointer"
          onClick={scrollToBottom}
          role="button"
          aria-label="Scroll paused — click to resume"
        >
          <Pause className="h-2.5 w-2.5 text-amber-400" />
          <span className="font-mono text-[10px] text-amber-400">
            scroll paused — click to resume
          </span>
        </div>
      )}
    </div>
  );
}
