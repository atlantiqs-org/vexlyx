import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

/**
 * Geist Sans — Primary UI font.
 * Matches the Vercel/Linear design aesthetic from CLAUDE.md Section 15.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Geist Mono — Used for code, logs, and terminal output.
 * Always rendered on dark background per CLAUDE.md Section 15.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Vexlyx",
    template: "%s — Vexlyx",
  },
  description:
    "Open-source hybrid hosting control panel. Deploy modern apps and manage traditional hosting services.",
};

/**
 * Root layout — wraps entire app with fonts and theme provider.
 * Uses `suppressHydrationWarning` on <html> to prevent next-themes
 * hydration mismatch when the theme class is injected client-side.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
