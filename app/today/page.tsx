"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { mockProposals, mockTarget } from "@/lib/mock-data";
import { logEvent, useActivity } from "@/lib/activity";
import { opportunityScoreFor } from "@/lib/lead-utils";
import { updateLead, useLeads } from "@/lib/crm";
import { fmtDate, fmtMoney, todayISO } from "@/lib/utils";
import type { Lead } from "@/lib/types";
import { ProbabilityBadge } from "@/components/probability-badge";
import { DailyTargets } from "@/components/daily-targets";
import AIPitchModal, { type PitchChannel } from "@/components/pitch-modal";
import { BellRing, PhoneCall, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TODAY = todayISO();
type SortKey = "probability" | "score" | "name" | "newest";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

function LeadDrawer({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const all = useActivity(lead?.id);
  if (!lead) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative h-full w-full max-w-sm overflow-auto border-l border-[#1c1c21] bg-[#0c0c0f] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#27272A] bg-[#121215] text-xs font-bold text-zinc-300">{initials(lead.name)}</span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">{lead.name}</h2>
              <p className="text-xs text-zinc-500">{lead.category} · {lead.city}, {lead.region}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-[#27272A] px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100">Close</button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#1c1c21] bg-[#121215] p-3">
          <span className="text-xs text-zinc-400">Lead score <span className="font-semibold tabular-nums text-zinc-100">{lead.score}/100</span></span>
          <ProbabilityBadge lead={lead} />
        </div>
        <h3 className="mt-4 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">Timeline</h3>
        <div className="mt-2 space-y-2">
          {all.slice(0, 10).map((a) => (
            <div key={a.id} className="rounded-lg border border-[#1c1c21] bg-[#121215] p-2.5 text-xs">
              <p className="font-medium capitalize text-zinc-200">{a.type.replace(/_/g, " ")}</p>
              <p className="text-zinc-500">{a.message} — {fmtDate(a.created_at)}</p>
            </div>
          ))}
          {all.length === 0 && <p className="text-xs text-zinc-600">No activity yet — pitch, snooze or call to create timeline events.</p>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-[#1c1c21] bg-[#121215] p-2.5"><p className="text-zinc-500">Email</p><p className="truncate text-zinc-200">{lead.email ?? "—"}</p></div>
          <div className="rounded-lg border border-[#1c1c21] bg-[#121215] p-2.5"><p className="text-zinc-500">Phone</p><p className="text-zinc-200">{lead.phone ?? "—"}</p></div>
        </div>
      </div>
    </div>
  );
}

function Row({ lead, onPitch, onSnooze, onLogCall, onView }: {
  lead: Lead; onPitch: (l: Lead) => void; onSnooze: (l: Lead) => void; onLogCall: (l: Lead) => void; onView: (l: Lead) => void;
}) {
  const overdue = (lead.next_follow_up ?? lead.nextFollowUp ?? TODAY) < TODAY;
  return (
    <div onClick={() => onView(lead)}
      className={cn("group flex cursor-pointer items-center gap-2.5 border-l-2 px-3 py-2.5 hover:bg-white/[0.03]",
        overdue ? "border-rose-500/70 bg-rose-500/[0.04]" : "border-amber-500/50")}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#27272A] bg-[#121215] text-[10px] font-bold text-zinc-400">{initials(lead.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-[13px] font-medium text-zinc-100">
          <span className="truncate">{lead.name}</span>
          <ProbabilityBadge lead={lead} />
        </p>
        <p className="truncate text-[11px] text-zinc-500">{lead.city}, {lead.region} · score {lead.score}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onPitch(lead)} title="Send Pitch — open the AI pitch generator for this lead"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-100"><Send size={14} /></button>
        <div className="hidden items-center gap-1 group-hover:flex">
          <button onClick={() => onPitch(lead)} title="AI Pitch"
            className="rounded-md border border-[#27272A] p-1.5 text-zinc-400 hover:text-blue-300"><Sparkles size={13} /></button>
          <button onClick={() => onSnooze(lead)} title="Snooze 3 Days — push follow-up out and clear the queue"
            className="rounded-md border border-[#27272A] px-1.5 py-1 text-[10px] text-zinc-400 hover:text-amber-300">+3d</button>
          <button onClick={() => onLogCall(lead)} title="Log Call — record a completed call on the timeline"
            className="rounded-md border border-[#27272A] p-1.5 text-zinc-400 hover:text-emerald-300"><PhoneCall size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, count, sub, children }: { title: string; count: number; sub: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#1c1c21] bg-[#0c0c0f]">
      <header className="px-4 pb-1 pt-3.5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-zinc-100">{title}
          <span title={`${count} items in this bucket`} className="cursor-help rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-400">{count}</span>
        </h2>
        <p className="mt-0.5 text-[12px] text-zinc-500">{sub}</p>
      </header>
      <div className="px-2 pb-2 pt-1">{children}</div>
    </section>
  );
}

const Empty = ({ text }: { text: string }) => (
  <p className="px-4 py-10 text-center text-[12px] text-zinc-500">
    {text} <Link href="/find-leads" className="ml-1 font-medium text-blue-400 hover:underline">Find leads <span className="ml-0.5">›</span></Link>
  </p>
);

export default function TodayPage() {
  const leads = useLeads();
  const events = useActivity();
  const [sort, setSort] = useState<SortKey>("probability");
  const [target, setTarget] = useState(mockTarget);
  const [pitchFor, setPitchFor] = useState<Lead | null>(null);
  const [view, setView] = useState<Lead | null>(null);
  const [reminders, setReminders] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2600); };

  const sorted = useMemo(() => {
    const c = [...leads];
    if (sort === "probability") c.sort((a, b) => opportunityScoreFor(b).score - opportunityScoreFor(a).score);
    if (sort === "score") c.sort((a, b) => b.score - a.score);
    if (sort === "name") c.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "newest") c.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return c;
  }, [leads, sort]);

  const repliedIds = useMemo(
    () => new Set(events.filter((e) => e.type === "reply_recorded").map((e) => e.lead_id)),
    [events]
  );
  const emailedIds = useMemo(
    () => new Set(events.filter((e) => e.type === "email_sent" || e.type === "whatsapp_opened" || e.type === "outreach_generated").map((e) => e.lead_id)),
    [events]
  );
  const followUps = sorted.filter((l) => (l.next_follow_up ?? l.nextFollowUp ?? TODAY) <= TODAY);
  const hotNew = sorted.filter((l) => opportunityScoreFor(l).score >= 70 && l.status === "new" && !emailedIds.has(l.id));
  const repliesWaiting = sorted.filter((l) => emailedIds.has(l.id) && !repliedIds.has(l.id));
  const aging = mockProposals.filter((p) => {
    const days = Math.floor((Date.now() - new Date(p.sent_at).getTime()) / 86400000);
    return (p.status as string) === "aging" || ((p.status as string) === "sent" && days > 3);
  });

  const logActivity = (lead: Lead, type: "email_sent" | "whatsapp_opened" | "reply_recorded" | "lead_updated", content: string) =>
    logEvent(lead.id, type, content);

  const pitchSent = (lead: Lead, channel: PitchChannel) => {
    if (channel === "whatsapp") {
      const phone = (lead.phone ?? "").replace(/[^+\d]/g, "");
      if (phone) window.open(`https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent("Hi — sharing a quick teardown for your clinic.")}`, "_blank");
    } else if (lead.email) {
      window.open(`mailto:${lead.email}?subject=${encodeURIComponent(`2 booking leaks I spotted — ${lead.name}`)}`, "_self");
    }
    setTarget((t) => ({ ...t, messages_sent_actual: t.messages_sent_actual + 1 }));
    logActivity(lead, channel === "email" ? "email_sent" : "whatsapp_opened", `AI pitch sent via ${channel}`);
    flash(`Pitch sent to ${lead.name} via ${channel} · ${target.messages_sent_actual + 1} of ${target.messages_sent_target}`);
  };

  const snooze = (lead: Lead) => {
    const d = new Date(TODAY + "T00:00:00Z"); d.setDate(d.getDate() + 3);
    const iso = d.toISOString();
    updateLead(lead.id, { next_follow_up: iso, nextFollowUp: iso });
    flash(`${lead.name} snoozed 3 days → ${iso.slice(0, 10)}`);
  };

  const logCall = (lead: Lead) => {
    logActivity(lead, "lead_updated", "Discovery call logged from Today queue");
    flash(`Call logged on ${lead.name} timeline`);
  };

  const list = (items: Lead[]) => (
    <div className="max-h-[420px] divide-y divide-white/[0.04] overflow-y-auto rounded-lg border border-[#1c1c21]">
      {items.map((l) => (
        <Row key={l.id} lead={l} onPitch={setPitchFor} onSnooze={snooze} onLogCall={logCall} onView={setView} />
      ))}
    </div>
  );

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Daily workflow</p>
      <div className="mt-1 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Today</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500">One screen for the follow-ups, replies, proposals, and targets that matter now.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label title="Sort the follow-up queue" className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#1c1c21] bg-[#0c0c0f] px-3 py-1.5 text-[12px] text-zinc-400">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent font-medium text-zinc-100 outline-none [&>option]:bg-[#121215]">
              <option value="probability">Probability %</option>
              <option value="score">Score</option>
              <option value="name">Business Name</option>
              <option value="newest">Newest</option>
            </select>
          </label>
          <button onClick={() => { setReminders(!reminders); flash(reminders ? "Reminders disabled" : "Daily reminders enabled — 9:00 AM IST"); }}
            title="Toggle a 9 AM daily nudge for overdue follow-ups"
            className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium",
              reminders ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : "border-[#1c1c21] bg-[#0c0c0f] text-zinc-300 hover:border-[#2a2a30]")}>
            <BellRing size={13} /> {reminders ? "Reminders on" : "Enable reminders"}
          </button>
        </div>
      </div>

      {toast && <div className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-xs text-emerald-200">{toast}</div>}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Card title="Follow-ups due" count={followUps.length} sub="Today or overdue">
          {followUps.length === 0 ? <Empty text="Queue clear." /> : list(followUps)}
        </Card>
        <Card title="Hot new leads" count={hotNew.length} sub="Score ≥ 70 · not contacted">
          {hotNew.length === 0 ? <Empty text="No hot new leads." /> : list(hotNew)}
        </Card>
        <Card title="Replies waiting" count={repliesWaiting.length} sub="Respond before momentum drops">
          {repliesWaiting.length === 0 ? <Empty text="No replies waiting." /> : list(repliesWaiting)}
        </Card>
        <Card title="Proposals aging" count={aging.length} sub="Sent more than 3 days ago">
          {aging.length === 0 ? <Empty text="No aging proposals." /> : (            <div className="divide-y divide-white/[0.04] rounded-lg border border-[#1c1c21]">
              {aging.map((p) => {
                const l = leads.find((x) => x.id === p.lead_id);
                return (
                  <div key={p.id} className="border-l-2 border-amber-500/60 px-3 py-2.5">
                    <p className="text-[13px] font-medium text-zinc-100">{p.title ?? p.id}</p>
                    <p className="text-[11px] text-zinc-500">{l?.name} · {fmtMoney(p.amount)} · sent {fmtDate(p.sent_at)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <DailyTargets target={target} />

      <AIPitchModal lead={pitchFor} onClose={() => setPitchFor(null)} onSent={pitchSent} />
      <LeadDrawer lead={view} onClose={() => setView(null)} />
    </div>
  );
}
