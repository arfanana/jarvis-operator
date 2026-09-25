import type { Activity, DailyTarget, Lead, Proposal } from "@/lib/types";

const T = (d: string) => new Date(d).toISOString();

export const teamMembers = [
  { id: "u1", name: "Aarav Mehta", role: "Closer", avatar: "AM" },
  { id: "u2", name: "Sara Khan", role: "SDR", avatar: "SK" },
  { id: "u3", name: "Dev Patel", role: "SDR", avatar: "DP" },
  { id: "u4", name: "Nina Rao", role: "Ops", avatar: "NR" },
];

// CRM starts empty — leads enter via Find Leads (scraper) or Add Leads (manual/CSV)
// and persist in localStorage (see lib/crm.ts). These legacy seed exports stay
// typed for pages that reference them but carry no rows.
export const mockLeads: Lead[] = [];

export const mockActivities: Activity[] = [];

export const mockProposals: Proposal[] = [];

export const mockTarget: DailyTarget = {
  id: "t-today",
  date: "2026-09-22",
  messages_sent_target: 30,
  messages_sent_actual: 0,
  replies_target: 5,
  replies_actual: 0,
  deals_target: 1,
  deals_actual: 0,
};
(mockTarget as any).messages_target = 30;

export const leadById = (id: string) => mockLeads.find((l) => l.id === id);

export const mockLogs = [
  { id: "g1", ts: T("2026-09-22T08:02:11"), level: "info", service: "crm", message: "Workspace ready — CRM starts empty, run Find Leads to seed" },
  { id: "g2", ts: T("2026-09-22T08:14:40"), level: "info", service: "scorer", message: "Scoring model loaded (reviews, rating, digital presence)" },
  { id: "g3", ts: T("2026-09-22T08:31:05"), level: "warn", service: "sender", message: "WhatsApp rate-limit near threshold (82%)" },
  { id: "g4", ts: T("2026-09-22T08:44:52"), level: "info", service: "ai", message: "Pitch generator ready (email + whatsapp)" },
  { id: "g5", ts: T("2026-09-22T09:05:19"), level: "error", service: "supabase", message: "No Supabase credentials — running on local store" },
  { id: "g6", ts: T("2026-09-22T09:12:33"), level: "info", service: "scheduler", message: "Follow-up queue watching local CRM" },
  { id: "g7", ts: T("2026-09-22T09:20:07"), level: "info", service: "proposals", message: "No proposals yet — send one from a lead profile" },
  { id: "g8", ts: T("2026-09-22T09:33:51"), level: "info", service: "web", message: "Health check OK — 142ms p95" },
];
