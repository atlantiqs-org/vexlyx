import type { Metadata } from "next";
import { UsersPage } from "@/components/users/UsersPage";

export const metadata: Metadata = {
  title: "Users — Vexlyx",
  description: "Manage panel users, roles, and per-account resource quotas.",
};

/**
 * /users — F5.5 User Roles & Permissions page. Admin-only; resellers see a
 * scoped view limited to their own sub-accounts. Client-side role gating
 * lives in UsersPage; the API also enforces this independently.
 */
export default function UsersPageRoute() {
  return <UsersPage />;
}
