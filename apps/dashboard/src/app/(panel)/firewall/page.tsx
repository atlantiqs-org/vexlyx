import type { Metadata } from "next";
import { FirewallPage } from "@/components/firewall/FirewallPage";

export const metadata: Metadata = {
  title: "Firewall — Vexlyx",
  description: "Manage UFW firewall rules and default incoming/outgoing traffic policy for this server.",
};

/**
 * /firewall — F5.4 Firewall Management page.
 * Server Component wrapper; all interactive content is in Client Components
 * inside FirewallPage.
 */
export default function FirewallPageRoute() {
  return <FirewallPage />;
}
