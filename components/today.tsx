"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { Lead } from "@/lib/types";
import { scoreBreakdownFor } from "@/lib/types";
import { pct } from "@/lib/utils";
import { Badge, Progress, Tip } from "@/components/ui";
import { leadStatusColor } from "@/lib/utils";
import { Eye, Mail, Clock, Sparkles } from "lucide-react";

export function FollowUpRow({ lead, onPitch, onSnooze, onSent }: { lead: Lead; onPitch: (l: Lead) => void; onSnooze: (l: Lead) => void; onSent?: (l: Lead) => void }) {
  const [showScore, setShowScore] = useState(false);
  const bd = scoreBreakdownFor(lead);
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-[#27272A] bg-[#121215] px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-zinc-100">{lead.name}</span>
          <Tip label="Conversion probability" content="Model estimate from reviews, fit and recency. Click score for full breakdown.">
            <button onClick={() => setShowScore(!showScore)} className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-400">{lead.score}</button>
          </Tip>
          <Badge className={leadStatusColor[lead.status]}>{lead.status.replace("_", " ")}</Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-zinc-500">{lead.category} · {lead.city}, {lead.region} · {Math.round(lead.conversion_probability * 100)}% prob</p>
        {showScore && (
          <div className="mt-2 rounded-lg border border-[#27272A] bg-[#09090B] p-2">
            {bd.map((b) => (
              <div key={b.label} className="flex items-center justify-between py-0.5 text-[11px]">
                <Tip label={b.label} content={b.detail}><span className="text-zinc-300 underline decoration-dotted">{b.label}</span></Tip>
                <span className="font-semibold text-emerald-400">+{b.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="hidden gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
        <button title="Send message" onClick={() => { onPitch(lead); onSent?.(lead); }} className="rounded-lg border border-[#27272A] p-1.5 text-zinc-400 hover:text-emerald-400"><Mail size={14} /></button>
        <button title="Snooze 3d" onClick={() => onSnooze(lead)} className="rounded-lg border border-[#27272A] p-1.5 text-zinc-400 hover:text-amber-400"><Clock size={14} /></button>
        <button title="AI Pitch" onClick={() => onPitch(lead)} className="rounded-lg border border-[#27272A] p-1.5 text-zinc-400 hover:text-violet-400"><Sparkles size={14} /></button>
        <Link href={`/leads/${lead.id}`} title="View profile" className="rounded-lg border border-[#27272A] p-1.5 text-zinc-400 hover:text-zinc-100"><Eye size={14} /></Link>
      </div>
    </div>
  );
}

export function TargetMeter({ label, actual, target, hint }: { label: string; actual: number; target: number; hint: string }) {
  return (
    <div className="rounded-xl border border-[#27272A] bg-[#121215] p-3">
      <div className="mb-2 flex items-center justify-between">
        <Tip label={label} content={hint}><span className="text-xs font-medium text-zinc-300 underline decoration-dotted">{label}</span></Tip>
        <span className="text-xs text-zinc-500">{actual}/{target} · {pct(actual, target)}%</span>
      </div>
      <Progress value={pct(actual, target)} marker={100} />
    </div>
  );
}

export function BucketCard({ title, count, href, children }: { title: string; count: number; href: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#27272A] bg-[#09090B] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-zinc-100">{title} <span className="ml-1 rounded-full bg-[#27272A] px-1.5 text-[11px] text-zinc-300">{count}</span></h4>
        <Link href={href} className="text-[11px] text-emerald-400 hover:underline">View all →</Link>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
