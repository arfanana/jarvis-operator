import type { Lead } from "@/lib/types";

export function generatePitch(lead: Lead, channel: "whatsapp" | "email" | "call"): { subject: string; body: string } {
  const pain = lead.website ? "your site is losing mobile bookings (slow load, no click-to-chat)" : "you have no website capturing the demand your reviews prove exists";
  const rating = lead.rating ?? 4.0;
  const value = lead.deal_value ?? 4500;
  if (channel === "email")
    return { subject: `${lead.name} — 2 booking leaks I spotted`, body: `Hi ${lead.name} team,\n\nLooked at ${lead.name} (${lead.category}, ${lead.city}). ${pain}. Two competitors in ${lead.region} fixed this with a one-page booking funnel + WhatsApp auto-reply and lifted bookings ~30%.\n\nI recorded a 90-second teardown specific to you (${rating.toFixed(1)}★, deal band ~$${value.toLocaleString()}). Want me to send it?\n\n— Jarvis Growth` };
  if (channel === "call")
    return { subject: `Call opener for ${lead.name}`, body: `1. "I found 2 places you're losing ${lead.category.toLowerCase()} bookings — 40 seconds, then I'll let you go."\n2. Cite: ${pain}.\n3. Offer the 90-second teardown. Close: "If it's not useful, I won't follow up."` };
  return { subject: `WhatsApp opener — ${lead.name}`, body: `Hi ${lead.name}! I help ${lead.category.toLowerCase()}s in ${lead.city} turn reviews into bookings. Noticed ${pain} — want a free 90-sec teardown video showing the 2 fixes? No pitch, just the video.` };
}

export function enrichLead(lead: Lead): string[] {
  const rating = lead.rating ?? 4.0;
  const value = lead.deal_value ?? 4500;
  return [
    `${lead.name} has ${rating.toFixed(1)}★ — review velocity suggests unmet demand in ${lead.region}.`,
    lead.website ? `Site present (${lead.website}) but likely slow on mobile — run a cleanup audit.` : "No website — highest-leverage opportunity: one-page funnel + WhatsApp capture.",
    `${lead.category} buyers in ${lead.city} convert best on WhatsApp first, email second.`,
    `Deal band for this niche: ₹${Math.round(value * 0.7).toLocaleString("en-IN")}–₹${Math.round(value * 1.3).toLocaleString("en-IN")}. Open at midpoint.`,
    lead.phone ? "Direct line available — call within 5 min of a reply for 3x close rate." : "No phone — lead with email, bridge to WhatsApp.",
  ];
}

export function classifyReply(text: string): { label: "hot" | "warm" | "objection" | "not-interested" | "spam"; confidence: number; action: string } {
  const t = text.toLowerCase();
  if (/not interested|stop|remove|unsubscribe/.test(t)) return { label: "not-interested", confidence: 0.92, action: "Archive lead, suppress 90 days. Log outcome." };
  if (/price|cost|expensive|budget|how much/.test(t)) return { label: "objection", confidence: 0.84, action: "Send pricing one-pager + anchor on ROI (bookings recovered). Offer 15-min teardown call." };
  if (/send|interested|yes|call|when|price list|more info/.test(t)) return { label: "hot", confidence: 0.88, action: "Reply within 5 minutes. Send teardown + Calendly link. Create proposal draft." };
  if (/maybe|later|busy|next month|thinking/.test(t)) return { label: "warm", confidence: 0.76, action: "Snooze 4 days. Send one proof asset (before/after screenshot)." };
  if (t.length < 12) return { label: "spam", confidence: 0.6, action: "Ignore. Keep lead in nurture." };
  return { label: "warm", confidence: 0.65, action: "Ask one qualifying question (decision maker? timeline?). Snooze 3 days." };
}
