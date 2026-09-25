"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { AppShell } from "@/components/layout";

const PUBLIC = ["/login", "/signup", "/reset-password", "/tooth-medic", "/sites"];
// Auth pages bounce signed-in users to /today. Showcase pages stay put.
const AUTH_ONLY = ["/login", "/signup", "/reset-password"];

/** Client-side route guard. Server APIs enforce auth independently. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, configured, devBypass } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAuthPage = AUTH_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (loading) return;
    if (isAuthPage) {
      if (user) router.replace("/today");
      return;
    }
    if (isPublic) return;
    // Configured backend + no session + no dev bypass → login.
    if (configured && !user && !devBypass) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, configured, devBypass, pathname, router, isPublic, isAuthPage]);

  if (loading && !isPublic) return <p className="grid h-screen place-items-center text-xs text-zinc-500">Loading…</p>;
  if (isPublic) return <>{children}</>;
  if (configured && !user && !devBypass) return <p className="grid h-screen place-items-center text-xs text-zinc-500">Redirecting to sign in…</p>;
  return <AppShell>{children}</AppShell>;
}
