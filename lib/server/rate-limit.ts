import { err } from "@/lib/server/errors";

// Per-endpoint server-side rate limits. In-memory authoritative; mirrored to the
// Supabase `rate_limits` table best-effort (for observability across restarts).
export const LIMITS = {
  ai: { limit: 30, windowMs: 60_000 },
  audit: { limit: 10, windowMs: 60_000 },
  search: { limit: 20, windowMs: 60_000 },
  verify: { limit: 20, windowMs: 60_000 },
  email: { limit: 30, windowMs: 60_000 },
  deploy: { limit: 10, windowMs: 60_000 },
  intelligence: { limit: 10, windowMs: 60_000 },
  leads_write: { limit: 60, windowMs: 60_000 },
} as const;

export type LimitName = keyof typeof LIMITS;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, opts?: { limit?: number; windowMs?: number }): { ok: boolean; remaining: number; resetAt: number } {
  const limit = opts?.limit ?? 30;
  const windowMs = opts?.windowMs ?? 60_000;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    persistBestEffort(key, 1, resetAt).catch(() => {});
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, resetAt: b.resetAt };
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

async function persistBestEffort(key: string, count: number, resetAt: number): Promise<void> {
  try {
    const { getDb, dbEnabled } = await import("@/lib/server/db");
    if (!dbEnabled()) return;
    await getDb().from("rate_limits").insert({ key, window_start: new Date(resetAt).toISOString(), count });
  } catch { /* observability only — never fail the request */ }
}

/** Enforce a named limit; throws rate_limited ApiError with Retry-After semantics. */
export function enforceLimit(name: LimitName, req: Request): void {
  const cfg = LIMITS[name];
  const rl = rateLimit(`${name}:${clientKey(req)}`, cfg);
  if (!rl.ok) {
    throw err("rate_limited", `Rate limit exceeded for ${name}. Try again in ${Math.ceil((rl.resetAt - Date.now()) / 1000)}s.`);
  }
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd;
  // Fall back to authenticated identity when available (set by routes via header).
  return req.headers.get("x-operator-id") ?? "local";
}
