"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SPIN_DURATION_MS = 600;

export function useRefreshAnimation() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const refresh = useCallback(async (action: () => Promise<unknown>) => {
    setIsRefreshing(true);
    try {
      await action();
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsRefreshing(false), SPIN_DURATION_MS);
    }
  }, []);

  return { isRefreshing, refresh };
}

export function refreshIconClassName(isRefreshing: boolean, sizeClassName = "h-4 w-4") {
  return cn(sizeClassName, "transition-transform duration-500", isRefreshing && "animate-spin text-primary");
}
