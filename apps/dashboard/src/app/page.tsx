import { redirect } from "next/navigation";

/**
 * Root page — redirects to the main dashboard.
 * The actual dashboard lives under the (panel) route group.
 */
export default function Home() {
  redirect("/dashboard");
}
