"use client";

import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Header bar — sits at the top of the main content area.
 * Mobile: shows hamburger menu to toggle sidebar.
 * Desktop: shows breadcrumb area (placeholder) and theme toggle.
 */
export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      {/* Mobile sidebar trigger — hidden on desktop */}
      <div className="md:hidden">
        <MobileSidebar />
      </div>

      {/* Breadcrumb area — placeholder for future implementation */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
