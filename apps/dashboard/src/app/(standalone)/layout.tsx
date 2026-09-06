import { redirect } from "next/navigation";
import { cookies } from "next/headers";

/**
 * Standalone layout — full-window layout without sidebar or panel header.
 * Used for full-screen tools like File Manager that open in a dedicated browser tab.
 *
 * Auth guard: checks for session cookie server-side and validates against the API.
 * Redirects to /login if not authenticated.
 */
export default async function StandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("vexlyx_session");

  if (!sessionCookie) {
    redirect("/login");
  }

  // Validate session against the API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  try {
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        Cookie: `vexlyx_session=${sessionCookie.value}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
