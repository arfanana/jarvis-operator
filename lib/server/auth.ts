import { createRemoteJWKSet, jwtVerify } from "jose";
import { err } from "@/lib/server/errors";

// Production auth: verify Supabase Auth JWT (from Authorization header or
// supabase auth cookies). Dev bypass ONLY when NODE_ENV=development AND
// ALLOW_DEV_AUTH=true explicitly. Production never bypasses.
export interface OperatorIdentity {
  id: string;
  email?: string;
  jwt?: string;
  dev: boolean;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function verifySupabaseJwt(token: string): Promise<{ sub: string; email?: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) return null;
  // Prefer the userinfo endpoint (works with anon key, no secret needed).
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon ?? "", Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const j = (await res.json()) as { id?: string; email?: string };
      if (j.id) return { sub: j.id, email: j.email };
    }
  } catch { /* fall through to JWKS */ }
  // Fallback: verify signature via JWKS.
  try {
    if (!jwks) jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, jwks, { issuer: `${url}/auth/v1` });
    if (typeof payload.sub === "string") {
      return { sub: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
    }
  } catch { /* invalid */ }
  return null;
}

function bearerFrom(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  // Supabase SSR cookie: sb-<project>-auth-token (JSON array with access_token).
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/sb-[^-]+-auth-token=([^;]+)/);
  if (m) {
    try {
      const raw = decodeURIComponent(m[1]);
      const parsed = JSON.parse(raw.startsWith("base64-") ? Buffer.from(raw.slice(7), "base64").toString("utf8") : raw);
      const token = Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token;
      if (typeof token === "string") return token;
    } catch { /* ignore malformed cookie */ }
  }
  return "";
}

export function devBypassAllowed(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_AUTH === "true";
}

export async function getOperator(req: Request): Promise<OperatorIdentity | null> {
  const token = bearerFrom(req);
  if (token) {
    const claims = await verifySupabaseJwt(token);
    if (claims) return { id: claims.sub, email: claims.email, jwt: token, dev: false };
    // Token present but invalid → do NOT fall through to bypass.
    return null;
  }
  if (devBypassAllowed()) {
    return { id: process.env.DEV_USER_ID ?? "local-operator", email: process.env.DEV_USER_EMAIL ?? "operator@local", dev: true };
  }
  // Explicit demo mode without a configured backend: limited demo identity.
  // DB-backed routes still refuse (guardDb); stateless routes (search, QR) work labeled DEMO.
  try {
    const { demoPersistenceEnabled } = await import("@/lib/server/db");
    const { NEXT_PUBLIC_SUPABASE_URL } = process.env;
    if (demoPersistenceEnabled() && !NEXT_PUBLIC_SUPABASE_URL) {
      return { id: "demo-operator", email: "demo@local", dev: true };
    }
  } catch { /* no demo */ }
  return null;
}

export async function requireOperator(req: Request): Promise<OperatorIdentity> {
  const op = await getOperator(req);
  if (!op) throw err("authentication", "Authentication required. Sign in to continue.");
  return op;
}
