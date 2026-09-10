import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = {
  title: "Settings — Vexlyx",
  description: "Account details, password, and server DNS/IP reference info.",
};

/**
 * /settings — F5.11 Panel Settings page.
 * Server Component wrapper; all interactive content is in Client Components
 * inside SettingsPage.
 */
export default function SettingsPageRoute() {
  return <SettingsPage />;
}
