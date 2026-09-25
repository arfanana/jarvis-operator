import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { err } from "@/lib/server/errors";

// Explicit persistence mode. Demo storage is ONLY available when
// NEXT_PUBLIC_DEMO_PERSISTENCE=true. Never silently fall back in production.
export function demoPersistenceEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_PERSISTENCE !== undefined) {
    return process.env.NEXT_PUBLIC_DEMO_PERSISTENCE === "true";
  }
  // Default: demo on in development, off in production.
  return process.env.NODE_ENV !== "production";
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function dbEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Server-side Supabase client (service role when available, else anon). */
let adminClient: SupabaseClient | null = null;
export function getDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || (!service && !anon)) {
    throw err(
      "not_configured",
      demoPersistenceEnabled()
        ? "Database not configured — running on explicit demo storage."
        : "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  if (!adminClient) {
    adminClient = createClient(url, (service ?? anon) as string, { auth: { persistSession: false } });
  }
  return adminClient;
}

/** RLS-compatible user-scoped client (user JWT, so RLS + ownership apply). */
export function getUserDb(jwt: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw err("not_configured", "Database not configured.");
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
}

export function toDbError(e: unknown, what = "Database operation failed."): never {
  const msg = e instanceof Error ? e.message : String(e);
  // Strip anything that looks like a secret/connection string.
  const safe = msg.replace(/service_role[^\s]*/gi, "[redacted]").replace(/key=[^\s&]*/gi, "key=[redacted]").slice(0, 300);
  throw err("database", what, safe);
}
