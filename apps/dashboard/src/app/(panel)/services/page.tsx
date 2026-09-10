import type { Metadata } from "next";
import { ServicesPage } from "@/components/services/ServicesPage";

export const metadata: Metadata = {
  title: "Services — Vexlyx",
  description: "Live status, controls, and logs for Postfix, Dovecot, CoreDNS, PostgreSQL, Redis, and the Docker daemon.",
};

/**
 * /services — F5.6 Service Status Dashboard page.
 * Server Component wrapper; all interactive content is in Client Components
 * inside ServicesPage.
 */
export default function ServicesPageRoute() {
  return <ServicesPage />;
}
