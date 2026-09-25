import { NextResponse, type NextRequest } from "next/server";

// Defense-in-depth: API routes verify auth themselves (requireOperator).
// This middleware keeps logged-out users off app pages when Supabase is configured.
const PUBLIC_PREFIXES = ["/login", "/signup", "/reset-password", "/tooth-medic", "/sites", "/api/", "/_next/", "/favicon.ico"];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p)) || path === "/") return NextResponse.next();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // No backend: explicit demo mode stays usable (labeled DEMO DATA); otherwise lock.
    if (process.env.NEXT_PUBLIC_DEMO_PERSISTENCE === "true") return NextResponse.next();
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
  }
  const hasSession = req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  if (!hasSession && process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_AUTH !== "true") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
