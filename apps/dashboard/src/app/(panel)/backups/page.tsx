import type { Metadata } from "next";
import { BackupsPage } from "@/components/backups/BackupsPage";

export const metadata: Metadata = {
  title: "Backups — Vexlyx",
  description:
    "Full-system backup snapshots of projects, databases, mail, and DNS, with scheduling, retention, and per-item restore.",
};

/**
 * /backups — F5.3 Backup System page.
 * Server Component wrapper; all interactive content is in Client Components
 * inside BackupsPage.
 */
export default function BackupsPageRoute() {
  return <BackupsPage />;
}
