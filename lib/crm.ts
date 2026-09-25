import { useSyncExternalStore } from "react";
import type { Lead, LeadStatus } from "@/lib/types";
import { detectDuplicates } from "@/lib/lead-utils";

// Persistence:
// - Supabase configured → server is source of truth; this module is a memory
//   cache hydrated from /api/leads (no localStorage business state in this mode).
// - NEXT_PUBLIC_DEMO_PERSISTENCE=true → explicit labeled demo storage (localStorage).
// - Otherwise (production default) → empty, locked: reads [], writes warn.
// Never silently fall back from production Supabase to demo storage.

import { dataMode } from "@/lib/data-mode";

const KEY = "jarvis-crm-leads";
const REV_KEY = "jarvis-crm-rev";

let leads: Lead[] = [];
let loaded = false;
let rev = 0;
let writeLock = false;
const listeners = new Set<() => void>();

function demoStoreEnabled(): boolean {
  try {
    return dataMode() === "demo";
  } catch {
    return typeof window !== "undefined" && process.env.NODE_ENV !== "production";
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  if (!demoStoreEnabled()) {
    leads = [];
    return; // locked: no local business state without explicit demo mode.
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) leads = JSON.parse(raw);
    rev = Number(localStorage.getItem(REV_KEY) ?? "0") || 0;
  } catch {
    leads = [];
  }
  if (typeof window !== "undefined" && demoStoreEnabled()) {
    window.addEventListener("storage", (e) => {
      if (e.key === KEY && e.newValue) {
        try {
          const incoming = JSON.parse(e.newValue) as Lead[];
          const incomingRev = Number(localStorage.getItem(REV_KEY) ?? "0") || 0;
          if (incomingRev >= rev) {
            leads = incoming;
            rev = incomingRev;
            emit();
          }
        } catch { /* ignore */ }
      }
    });
  }
}

function persist() {
  if (!demoStoreEnabled()) return; // supabase mode: memory cache only, server is truth.
  try {
    rev += 1;
    localStorage.setItem(KEY, JSON.stringify(leads));
    localStorage.setItem(REV_KEY, String(rev));
  } catch {
    /* storage unavailable */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function snapshot(): Lead[] {
  load();
  return leads;
}

/** Reactive CRM lead list. Starts empty — fill via Find Leads or Add Leads. */
const EMPTY_LEADS: Lead[] = [];
export function useLeads(): Lead[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY_LEADS);
}

/** Non-reactive read for query functions / server-safe contexts. */
export function getLeadsSnapshot(): Lead[] {
  if (typeof window === "undefined") return [];
  load();
  return leads;
}

/** Replace the in-memory cache with server rows (supabase mode hydration). */
export function hydrateLeadsFromServer(rows: Lead[]) {
  load();
  leads = Array.isArray(rows) ? rows : [];
  emit();
}

let syncing = false;
/** Best-effort hydration from /api/leads (supabase mode). Returns { ok, error? } with the real reason. */
export async function syncLeadsFromServer(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || syncing) return { ok: false };
  try {
    if (dataMode() !== "supabase") return { ok: false };
    syncing = true;
    const { apiFetch } = await import("@/lib/supabase");
    const r = await apiFetch("/api/leads?pageSize=200");
    if (!r.ok) {
      let detail = `server ${r.status}`;
      try {
        const j = (await r.json()) as { error?: { code?: string; message?: string } };
        if (j.error?.message) detail = `${j.error.code ?? "error"}: ${j.error.message}`;
      } catch { /* keep status */ }
      if (r.status === 401) return { ok: false, error: "Signed out — please sign in again." };
      return { ok: false, error: `Leads request failed (${detail}).` };
    }
    const j = (await r.json()) as { rows?: Lead[] };
    if (Array.isArray(j.rows)) {
      hydrateLeadsFromServer(j.rows.map(mapServerLead));
      return { ok: true };
    }
    return { ok: false, error: "Unexpected response shape from /api/leads." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? `Network error: ${e.message}` : "Network error." };
  } finally {
    syncing = false;
  }
}

/** Map DB row (snake_case review_count) to client Lead shape. */
export function mapServerLead(r: Lead | Record<string, unknown>): Lead {
  const l = r as unknown as Lead & { review_count?: number };
  return { ...l, reviewCount: l.reviewCount ?? l.review_count ?? 0 };
}

async function postLeadToServer(lead: Lead): Promise<void> {
  try {
    if (dataMode() !== "supabase") return;
    const { apiFetch } = await import("@/lib/supabase");
    await apiFetch("/api/leads", { method: "POST", body: JSON.stringify({ ...lead, id: undefined }) }).catch(() => {});
  } catch { /* best-effort write-through */ }
}

async function patchLeadOnServer(id: string, patch: Partial<Lead>): Promise<void> {
  try {
    if (dataMode() !== "supabase") return;
    const { apiFetch } = await import("@/lib/supabase");
    await apiFetch(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch(() => {});
  } catch { /* best-effort */ }
}

async function deleteLeadsOnServer(ids: string[]): Promise<void> {
  try {
    if (dataMode() !== "supabase") return;
    const { apiFetch } = await import("@/lib/supabase");
    await Promise.all(ids.map((id) => apiFetch(`/api/leads/${id}`, { method: "DELETE" }).catch(() => {})));
  } catch { /* best-effort */ }
}

/** Explicit server save with a user-visible result. Use in import flows so
 * failures are shown instead of silently lost (local add is fire-and-forget). */
export async function saveLeadsToServer(rows: Lead[]): Promise<{ ok: boolean; created: number; skipped: number; error?: string }> {
  try {
    if (dataMode() !== "supabase") return { ok: true, created: rows.length, skipped: 0 };
    if (!rows.length) return { ok: true, created: 0, skipped: 0 };
    const { apiFetch } = await import("@/lib/supabase");
    const clean = rows.map((l) => {
      const { id, ...rest } = l as Lead & { id?: string };
      void id;
      return rest;
    });
    const r = await apiFetch("/api/leads", { method: "POST", body: JSON.stringify(clean) });
    const j = (await r.json().catch(() => ({}))) as { created?: unknown[]; skipped?: number; error?: { message?: string } };
    if (!r.ok) return { ok: false, created: 0, skipped: 0, error: j.error?.message ?? `server ${r.status}` };
    return { ok: true, created: j.created?.length ?? 0, skipped: j.skipped ?? 0 };
  } catch (e) {
    return { ok: false, created: 0, skipped: 0, error: e instanceof Error ? e.message : "Network error" };
  }
}

export interface AddResult { added: Lead[]; skipped: { lead: Lead; reasons: string[] }[]; }

/** Add with duplicate detection (phone / normalized name / domain / place_id). */
export function addLeads(rows: Lead[], opts?: { sync?: boolean }): AddResult {
  load();
  if (dataMode() === "unconfigured") {
    console.warn("[jarvis] persistence not configured — lead not saved.");
    return { added: [], skipped: rows.map((lead) => ({ lead, reasons: ["unconfigured"] })) };
  }
  if (writeLock) {
    // Serialize concurrent saves to avoid race conditions.
    const pending = [...rows];
    const timer = setInterval(() => {
      if (!writeLock) {
        clearInterval(timer);
        addLeads(pending);
      }
    }, 25);
    return { added: [], skipped: [] };
  }
  writeLock = true;
  try {
    const ids = new Set(leads.map((l) => l.id));
    const added: Lead[] = [];
    const skipped: AddResult["skipped"] = [];
    for (const r of rows) {
      if (ids.has(r.id)) continue;
      const dups = detectDuplicates({ name: r.name, phone: r.phone, website: r.website, placeId: r.place_id }, leads.concat(added));
      if (dups.length) {
        skipped.push({ lead: r, reasons: dups[0].reasons });
        continue;
      }
      leads.push(r);
      ids.add(r.id);
      added.push(r);
    }
    persist();
    emit();
    if (opts?.sync !== false) added.forEach((a) => void postLeadToServer(a));
    return { added, skipped };
  } finally {
    writeLock = false;
  }
}

export function updateLead(id: string, patch: Partial<Lead>) {
  load();
  if (dataMode() === "unconfigured") return;
  leads = leads.map((l) => (l.id === id ? { ...l, ...patch } : l));
  persist();
  emit();
  void patchLeadOnServer(id, patch);
}

export function removeLeads(ids: string[]) {
  load();
  if (dataMode() === "unconfigured") return;
  const gone = new Set(ids);
  leads = leads.filter((l) => !gone.has(l.id));
  persist();
  emit();
  void deleteLeadsOnServer(ids);
}

export function clearLeads() {
  if (dataMode() === "unconfigured") return;
  leads = [];
  persist();
  emit();
}

let seq = 0;
export function buildLead(input: {
  name: string;
  category?: string;
  city?: string;
  region?: string;
  email?: string;
  phone?: string;
  website?: string;
  website_status?: Lead["website_status"];
  place_id?: string;
  score?: number;
  rating?: number;
  reviewCount?: number;
  status?: LeadStatus;
  deal_value?: number;
  source?: string;
}): Lead {
  const score = input.score ?? 50;
  const now = new Date().toISOString();
  const due = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
  seq += 1;
  return {
    id: `c${Date.now().toString(36)}${seq}`,
    name: input.name,
    category: input.category || "General",
    city: input.city || "Hyderabad",
    region: input.region || "Telangana",
    score,
    conversion_probability: Math.min(0.97, Math.max(0.05, score / 100)),
    status: input.status ?? "new",
    assigned_to: "u2",
    created_at: now,
    email: input.email || undefined,
    phone: input.phone || undefined,
    website: input.website || undefined,
    website_status: input.website_status ?? (input.website ? "unknown" : "no_website"),
    place_id: input.place_id || undefined,
    rating: input.rating,
    reviewCount: input.reviewCount,
    deal_value: input.deal_value ?? score * 900,
    nextFollowUp: due,
    next_follow_up: due,
    source: input.source ?? "manual",
  };
}
