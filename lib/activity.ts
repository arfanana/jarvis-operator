import { useSyncExternalStore } from "react";
import { dataMode } from "@/lib/data-mode";

export type LeadEventType =
  | "lead_created" | "lead_imported" | "lead_enriched" | "lead_scored" | "lead_updated"
  | "website_checked" | "audit_generated" | "score_updated"
  | "outreach_generated" | "whatsapp_opened"
  | "email_sent" | "email_failed" | "reply_recorded"
  | "proposal_created" | "proposal_generated" | "proposal_sent"
  | "demo_created" | "demo_generated" | "demo_deployed"
  | "invoice_created" | "payment_recorded" | "stage_changed"
  | "note_added" | "task_created" | "task_completed";

export interface LeadEvent {
  id: string;
  lead_id: string | null;
  type: LeadEventType;
  message: string;
  meta?: Record<string, unknown>;
  created_at: string;
}

// Demo-mode local cache. Supabase mode: server (lead_events) is truth;
// local entries are a transient cache. Unconfigured: locked (no events).
const KEY = "jarvis-activity-events";
let events: LeadEvent[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function demoStoreEnabled(): boolean {
  try { return dataMode() === "demo"; } catch { return false; }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  if (!demoStoreEnabled()) { events = []; return; }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) events = JSON.parse(raw);
  } catch { events = []; }
}
function persist() {
  if (!demoStoreEnabled()) return;
  try { localStorage.setItem(KEY, JSON.stringify(events.slice(-500))); } catch { /* noop */ }
}
function emit() { listeners.forEach((l) => l()); }
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

const EMPTY_EVENTS: LeadEvent[] = [];
export function useActivity(leadId?: string): LeadEvent[] {
  const all = useSyncExternalStore(subscribe, () => { load(); return events; }, () => EMPTY_EVENTS);
  if (!leadId) return [...all].reverse();
  return all.filter((e) => e.lead_id === leadId).reverse();
}

export function getEventsSnapshot(): LeadEvent[] {
  if (typeof window === "undefined") return [];
  load();
  return events;
}

async function postEventToServer(ev: LeadEvent): Promise<void> {
  try {
    if (dataMode() !== "supabase") return;
    const { apiFetch } = await import("@/lib/supabase");
    await apiFetch("/api/activity", {
      method: "POST",
      body: JSON.stringify({ lead_id: ev.lead_id, type: ev.type, message: ev.message, meta: ev.meta ?? {} }),
    }).catch(() => {});
  } catch { /* best-effort — local cache remains */ }
}

export function logEvent(lead_id: string | null, type: LeadEventType, message: string, meta?: Record<string, unknown>): LeadEvent {
  load();
  const ev: LeadEvent = { id: `e${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`, lead_id, type, message, meta, created_at: new Date().toISOString() };
  if (dataMode() === "unconfigured") return ev;
  events.push(ev);
  if (events.length > 500) events = events.slice(-500);
  persist(); emit();
  void postEventToServer(ev);
  return ev;
}

/** Hydrate the transient cache with server-persisted events. */
export function hydrateEventsFromServer(rows: LeadEvent[]) {
  load();
  events = Array.isArray(rows) ? rows : [];
  emit();
}

export function clearEvents() { events = []; persist(); emit(); }
