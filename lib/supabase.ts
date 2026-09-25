import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

let browser: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Browser Supabase client (anon key; RLS enforced server-side). Null when unconfigured. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (!browser) {
    browser = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
  }
  return browser;
}

export async function getSessionUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Authenticated fetch helper: attaches the Supabase JWT when signed in. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken().catch(() => null);
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// Legacy compat (demo store). Prefer repository-backed API routes.
export { mockLeads } from "@/lib/mock-data";
import { mockLeads } from "@/lib/mock-data";
import type { Lead } from "@/lib/types";
export async function fetchLeads(): Promise<Lead[]> {
  return mockLeads;
}
export function createClient() {
  return getSupabase();
}
