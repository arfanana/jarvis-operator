export type OutreachChannel = "email" | "whatsapp";
export type OutreachStatus = "draft" | "sent" | "opened" | "replied" | "failed" | "completed";

export interface OutreachTemplate {
  id: string;
  label: string;
  channel: OutreachChannel;
  subject: string;
  body: string;
}

const T = (business: string, city: string, category: string) => ({ business, city, category });

export function outreachTemplates(business = "{{business}}", city = "{{city}}", category = "{{category}}"): OutreachTemplate[] {
  void T;
  return [
    { id: "first-contact", label: "First contact", channel: "email", subject: `${business} — 2 booking leaks I spotted`, body: `Hi ${business} team,\n\nI looked at ${business} (${category}, ${city}). Your reviews show real demand, but mobile visitors can't book in one tap — that's where most local ${category.toLowerCase()}s leak revenue.\n\nI recorded a 90-second teardown specific to you. Want me to send it?\n\n— Jarvis Growth` },
    { id: "followup-1", label: "Follow-up #1", channel: "email", subject: `Re: ${business} teardown`, body: `Quick bump — did the teardown idea land? Two ${category.toLowerCase()}s in ${city} fixed this with a one-page funnel + WhatsApp auto-reply.\n\nOpen to a 15-min walkthrough?` },
    { id: "followup-2", label: "Follow-up #2", channel: "email", subject: `${business} — before/after example`, body: `Attaching a before/after from a similar ${category.toLowerCase()} in ${city}: load time 5.1s → 1.6s, tap-to-call added, bookings +30%.\n\nWorth 15 minutes?` },
    { id: "final", label: "Final follow-up", channel: "email", subject: `Closing the loop — ${business}`, body: `I'll close this out on my side. If bookings dip or you want the teardown later, reply "TEARDOWN" and I'll send it.\n\nGood luck in ${city}.` },
    { id: "proposal-followup", label: "Proposal follow-up", channel: "email", subject: `Proposal for ${business} — next step?`, body: `Checking in on the proposal. The fastest win is the mobile booking funnel — we can ship it this week.\n\nWant me to hold a slot?` },
    { id: "demo-followup", label: "Demo follow-up", channel: "email", subject: `Your demo site is live — ${business}`, body: `Your preview site is live. Open it on your phone — tap-to-call + WhatsApp are wired up.\n\nReply and I'll point your domain at it.` },
    { id: "wa-first", label: "First contact (WhatsApp)", channel: "whatsapp", subject: `WhatsApp opener — ${business}`, body: `Hi ${business}! I help ${category.toLowerCase()}s in ${city} turn reviews into bookings. Noticed a couple of mobile leaks — want a free 90-sec teardown video? No pitch, just the video.` },
  ];
}

export interface SequenceStep { day: number; templateId: string; label: string; }

export const DEFAULT_SEQUENCE: SequenceStep[] = [
  { day: 0, templateId: "first-contact", label: "Initial message" },
  { day: 2, templateId: "followup-1", label: "Follow-up" },
  { day: 5, templateId: "followup-2", label: "Value follow-up" },
  { day: 10, templateId: "final", label: "Final follow-up" },
];

export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
