"use client";
import type { DailyTarget } from "@/lib/types";

function Meter({ label, actual, target, hint }: { label: string; actual: number; target: number; hint: string }) {
  const pct = Math.min(100, Math.round((actual / Math.max(1, target)) * 100));
  return (
    <div className="group relative cursor-help" title={hint}>
      <p className="text-[13px] font-medium text-zinc-200">{label}</p>
      <p className="mt-0.5 text-[11px] tabular-nums text-zinc-500">{actual} of {target}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10" title={`${pct}% of daily target`}>
          <div className="h-1 rounded-full bg-zinc-300 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] tabular-nums text-zinc-500">{pct}%</span>
      </div>
      <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-60 rounded-lg border border-[#27272A] bg-[#121215] p-2.5 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        <span className="block text-[11px] font-semibold text-zinc-100">{label}</span>
        <span className="block text-[11px] leading-snug text-zinc-400">{hint}</span>
      </span>
    </div>
  );
}

export function DailyTargets({ target }: { target: DailyTarget }) {
  return (
    <section className="mt-4 rounded-xl border border-[#1c1c21] bg-[#0c0c0f] px-4 pb-4 pt-3.5">
      <h2 className="text-[14px] font-semibold text-zinc-100">Daily targets</h2>
      <p className="mt-0.5 text-[12px] text-zinc-500">Messages, replies, and deals against the current day.</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        <Meter label="Messages sent" actual={target.messages_sent_actual} target={target.messages_sent_target}
          hint={`${target.messages_sent_actual}/${target.messages_sent_target} outreach messages dispatched today. Auto-increments on every WhatsApp/Email send from the Today queue.`} />
        <Meter label="Replies received" actual={target.replies_actual} target={target.replies_target}
          hint={`${target.replies_actual}/${target.replies_target} inbound replies. Replies Waiting flags unanswered inbound messages — respond before momentum drops.`} />
        <Meter label="Deals closed" actual={target.deals_actual} target={target.deals_target}
          hint={`${target.deals_actual}/${target.deals_target} deals won today. Closed value rolls into Revenue → closed-won and MRR.`} />
      </div>
    </section>
  );
}
