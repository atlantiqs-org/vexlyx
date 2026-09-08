import type { Metadata } from "next";
import { MonitoringPage } from "@/components/monitoring/MonitoringPage";

export const metadata: Metadata = {
  title: "Monitoring — Vexlyx",
  description:
    "Real-time server and container resource monitoring. Track CPU, RAM, disk, and network usage with historical trends and threshold alerts.",
};

/**
 * /monitoring — F5.2 Resource Monitoring page.
 * Server Component wrapper; all real-time content is in Client Components
 * inside MonitoringPage.
 */
export default function MonitoringPageRoute() {
  return <MonitoringPage />;
}
