"use client";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { explainScore } from "@/lib/lead-utils";

export function ProbabilityBadge({ lead }: { lead: Lead }) {
  const { score, positives, negatives, missing, breakdown } = explainScore(lead);
  const tone = score >= 75 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : score >= 60 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-rose-500/15 text-rose-400 border-rose-500/30";
  const total = breakdown.reduce((s, b) => s + b.points, 0);
  const Section = ({ title, items, dot }: { title: string; items: typeof breakdown; dot: string }) =>
    items.length ? (
      <span className="mt-1.5 block">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</span>
        {items.map((b) => (
          <span key={b.label} className="flex items-center justify-between gap-2 py-0.5 text-[11px]" title={`${b.detail} · ${b.confidence}`}>
            <span className="flex items-center gap-1.5 text-zinc-400"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{b.label}</span>
            <span className="font-semibold tabular-nums text-zinc-200">+{b.points}</span>
          </span>
        ))}
      </span>
    ) : null;
  return (
    <span className="group relative inline-flex cursor-help">
      <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", tone)} title={`Opportunity Score ${score}/100 — explainable estimate, not a calibrated conversion probability`}>
        {score} opp
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 max-h-80 w-72 -translate-x-1/2 overflow-y-auto rounded-xl border border-[#27272A] bg-[#121215] p-3 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <span className="block text-[11px] font-semibold text-zinc-100">Opportunity Score — {score}/100</span>
        <span className="mb-1 block text-[10px] text-zinc-500">Explainable estimate ({total} pts). Not a calibrated conversion probability.</span>
        <Section title={`Positive signals (${positives.length})`} items={positives} dot="bg-emerald-500" />
        <Section title={`Negative signals (${negatives.length})`} items={negatives} dot="bg-amber-500" />
        <Section title={`Missing data (${missing.length})`} items={missing} dot="bg-zinc-600" />
      </span>
    </span>
  );
}

export const OpportunityBadge = ProbabilityBadge;
