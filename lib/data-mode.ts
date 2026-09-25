import { apiFetch, supabaseConfigured } from "@/lib/supabase";

// Explicit persistence mode — never silent.
// - "supabase": Supabase URL+key configured → server is the source of truth.
// - "demo": NEXT_PUBLIC_DEMO_PERSISTENCE=true (or dev default) → labeled local demo storage.
// - "unconfigured": production without Supabase and without explicit demo flag → empty, locked states.
export type DataMode = "supabase" | "demo" | "unconfigured";

export function dataMode(): DataMode {
  if (supabaseConfigured()) return "supabase";
  const flag = process.env.NEXT_PUBLIC_DEMO_PERSISTENCE;
  if (flag === "true") return "demo";
  if (flag === "false") return "unconfigured";
  return process.env.NODE_ENV === "production" ? "unconfigured" : "demo";
}

export function isDemoMode(): boolean {
  return dataMode() === "demo";
}

export function persistenceStatus(): { mode: DataMode; label: string; detail: string } {
  const mode = dataMode();
  if (mode === "supabase") return { mode, label: "LIVE DATA", detail: "Persisted in Supabase (workspace-scoped)." };
  if (mode === "demo") return { mode, label: "DEMO DATA", detail: "Local demo storage — set Supabase env vars for production." };
  return { mode, label: "NOT CONFIGURED", detail: "Set Supabase env vars or NEXT_PUBLIC_DEMO_PERSISTENCE=true for local demo." };
}

export function apiErrorMessage(j: unknown, fallback: string): string {
  const e = (j as { error?: { message?: string } | string })?.error;
  if (typeof e === "string") return e;
  if (e?.message) return e.message;
  return fallback;
}

export { apiFetch };
