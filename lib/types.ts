export type LeadStatus = "new" | "contacted" | "proposal_sent" | "won" | "lost" | "proposal" | "replied";
export type ActivityType = "email" | "whatsapp" | "call" | "note";
export type ActivityStatus = "pending" | "completed" | "overdue";
export type ProposalStatus = "aging" | "accepted" | "rejected";
export type WebsiteStatus = "functional" | "unreachable" | "unknown" | "no_website" | "needs_improvement";

export interface Lead {
  id: string;
  name: string;
  category: string;
  city: string;
  region: string;
  score: number;
  /** Legacy calibrated-looking field — kept for compat. Prefer Opportunity Score (lib/lead-utils). */
  conversion_probability: number;
  status: LeadStatus;
  assigned_to: string;
  created_at: string;
  phone?: string;
  email?: string;
  website?: string;
  website_status?: WebsiteStatus;
  place_id?: string;
  rating?: number;
  reviewCount?: number;
  lastContactAt?: string;
  nextFollowUp?: string;
  next_follow_up?: string;
  source?: string;
  deal_value?: number;
  probability?: number;
  score_breakdown?: { signal: string; points: number }[];
}

export interface Activity {
  id: string;
  lead_id: string;
  type: ActivityType;
  content: string;
  due_date: string;
  status: ActivityStatus;
  created_at: string;
  subject?: string;
  body?: string;
  awaiting_reply?: boolean;
  due_at?: string | null;
}

export interface Proposal {
  id: string;
  lead_id: string;
  amount: number;
  sent_at: string;
  status: ProposalStatus | "sent";
  title?: string;
  created_at?: string;
}

export interface DailyTarget {
  id: string;
  date: string;
  messages_sent_target: number;
  messages_sent_actual: number;
  replies_target: number;
  replies_actual: number;
  deals_target: number;
  deals_actual: number;
  messages_target?: number;
}

export interface ScoreBreakdown {
  label: string;
  points: number;
  detail: string;
}

export function scoreBreakdownFor(lead: Lead): ScoreBreakdown[] {
  // Transparent Opportunity Score breakdown (not a calibrated conversion probability).
  const out: ScoreBreakdown[] = [];
  out.push({
    label: "Search fit",
    points: lead.category && lead.category !== "General" ? 12 : 6,
    detail: `${lead.category} in ${lead.city} — Detected`,
  });
  out.push({
    label: "Business signals",
    points: Math.min(20, Math.round((lead.reviewCount ?? 0) / 10) + (lead.rating && lead.rating >= 4 ? 8 : 5)),
    detail: `${lead.reviewCount ?? 0} reviews · ${lead.rating?.toFixed(1) ?? "—"}★ — Measured`,
  });
  out.push({
    label: "Contactability",
    points: lead.phone && lead.email ? 18 : lead.phone || lead.email ? 10 : 2,
    detail: [lead.phone ? "phone ✓" : "no phone", lead.email ? "email ✓" : "no email"].join(" · ") + " — Measured",
  });
  const ws = lead.website_status;
  out.push({
    label: "Website opportunity",
    points: !lead.website ? 15 : ws === "needs_improvement" ? 14 : ws === "functional" ? 8 : 10,
    detail: !lead.website ? "No website — high-need prospect — Inferred" : `Has site (${ws ?? "unknown"}) — Detected`,
  });
  out.push({
    label: "Review/reputation",
    points: lead.rating ? (lead.rating < 4.2 ? 15 : lead.rating < 4.6 ? 10 : 6) : 8,
    detail: lead.rating ? `${lead.rating.toFixed(1)}★ gap analysis — Measured` : "No rating — Needs verification",
  });
  out.push({
    label: "Location fit",
    points: lead.city ? 10 : 5,
    detail: `${lead.city}, ${lead.region} — Detected`,
  });
  return out;
}
