import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication",
};

/**
 * Auth layout — centered card layout for login/register pages.
 * No sidebar or header — clean, minimal authentication experience.
 * Matches CLAUDE.md design: "Vercel dashboard meets Linear app"
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
