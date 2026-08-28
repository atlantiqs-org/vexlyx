"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider wrapper for next-themes.
 * Separated into its own file because providers must be Client Components,
 * while the root layout remains a Server Component.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
