/**
 * Timezone-aware date/time formatting helpers (F5.13).
 * Every caller takes an explicit `timezone` (from useSystemSettings()) so
 * that omitting it — rather than silently falling back to the browser's
 * local zone — is a visible choice at the call site. Passing `undefined`
 * still falls back to the browser's zone (used while the setting is loading).
 */

export function formatDateTime(date: string | Date, timezone?: string): string {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  });
}

export function formatDate(date: string | Date, timezone?: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    dateStyle: "medium",
    timeZone: timezone,
  });
}

export function formatTime(date: string | Date, timezone?: string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    timeStyle: "short",
    timeZone: timezone,
  });
}
