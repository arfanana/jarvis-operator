"use client";
import Link from "next/link";
import { useState } from "react";
import type { Lead, LeadStatus } from "@/lib/types";
import { explainScore } from "@/lib/lead-utils";
import { fmtDate, fmtMoney, timeAgo } from "@/lib/utils";
import { updateLead } from "@/lib/crm";
import { logEvent, useActivity } from "@/lib/activity";

const STAGES: LeadStatus[] = ["new", "contacted", "replied", "proposal", "proposal_sent", "won", "lost"];

export function LeadDrawer({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const activity = useActivity(lead?.id);
  const [copied, setCopied] = useState<string | null>(null);
  if (!lead) return null;
  const { score, positives, negatives, missing } = explainScore(lead);

  const copy = async (label: string, text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const setStage = (status: LeadStatus) => {
    updateLead(lead.id, { status });
    logEvent(lead.id, "stage_changed", `Stage → ${status}`);
  };

  const Row = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex items-center gap-2 rounded-lg border border-[#1c1c21] bg-[#121215] px-2.5 py-2 text-xs">
      <span className="w-20 shrink-0 text-zinc-500">{label}</span>
      <span className="min-w-0 flex-1 truncate text-zinc-200" title={value ?? "—"}>{value || "—"}</span>
      {value && (
        <button onClick={() => copy(label, value)} className="shrink-0 rounded border border-[#27272A] px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-100">
          {copied === label ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label={`Lead details for ${lead.name}`} onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[#1c1c21] bg-[#0c0c0f] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-zinc-100">{lead.name}</h2>
            <p className="text-xs text-zinc-500">{lead.category} · {lead.city}{lead.region ? `, ${lead.region}` : ""}</p>
          </div>
          <button onClick={onClose} aria-label="Close lead details" className="shrink-0 rounded-lg border border-[#27272A] px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100">Close</button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">Stage
            <select value={lead.status} onChange={(e) => setStage(e.target.value as LeadStatus)} aria-label="Pipeline stage"
              className="rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-zinc-100 outline-none">
              {STAGES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </label>
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300" title="Explainable estimate, not a calibrated probability">
            Opportunity {score}/100
          </span>
          <span className="text-xs tabular-nums text-zinc-400">{fmtMoney(lead.deal_value ?? 0)}</span>
        </div>

        <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Contact & web</h3>
        <div className="mt-2 space-y-1.5">
          <Row label="Phone" value={lead.phone} />
          <Row label="Email" value={lead.email} />
          <Row label="Website" value={lead.website} />
          <Row label="Site status" value={lead.website_status} />
          <Row label="Rating" value={lead.rating !== undefined ? `${lead.rating}★ · ${lead.reviewCount ?? 0} reviews` : undefined} />
          <Row label="Follow-up" value={(lead.next_follow_up ?? lead.nextFollowUp ?? undefined)?.slice(0, 10)} />
          <Row label="Source" value={lead.source} />
        </div>

        <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Why this score</h3>
        <div className="mt-2 space-y-1 text-xs">
          {positives.length > 0 && <p className="text-zinc-300"><span className="font-semibold text-emerald-300">+ Positive:</span> {positives.map((b) => `${b.label} (+${b.points})`).join(" · ")}</p>}
          {negatives.length > 0 && <p className="text-zinc-300"><span className="font-semibold text-amber-300">− Negative:</span> {negatives.map((b) => `${b.label} (+${b.points})`).join(" · ")}</p>}
          {missing.length > 0 && <p className="text-zinc-300"><span className="font-semibold text-zinc-400">? Missing:</span> {missing.map((b) => b.label).join(" · ")}</p>}
        </div>

        <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Actions</h3>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <Link href={`/outreach`} className="rounded-lg border border-[#27272A] px-2 py-1.5 text-zinc-300 hover:bg-white/5">Outreach</Link>
          <Link href={`/ai-tools`} className="rounded-lg border border-[#27272A] px-2 py-1.5 text-zinc-300 hover:bg-white/5">AI tools</Link>
          <Link href={`/website-cleanup`} className="rounded-lg border border-[#27272A] px-2 py-1.5 text-zinc-300 hover:bg-white/5">Audit site</Link>
          <Link href={`/demos`} className="rounded-lg border border-[#27272A] px-2 py-1.5 text-zinc-300 hover:bg-white/5">Demo</Link>
          <Link href={`/invoices`} className="rounded-lg border border-[#27272A] px-2 py-1.5 text-zinc-300 hover:bg-white/5">Invoice</Link>
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noreferrer" className="rounded-lg border border-[#27272A] px-2 py-1.5 text-zinc-300 hover:bg-white/5">Open site ↗</a>
          )}
          {lead.phone && (
            <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-700 px-2 py-1.5 text-emerald-300 hover:bg-emerald-950">WhatsApp ↗</a>
          )}
        </div>

        <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Timeline</h3>
        <div className="mt-2 space-y-1.5">
          {activity.slice(0, 20).map((a) => (
            <div key={a.id} className="rounded-lg border border-[#1c1c21] bg-[#121215] p-2.5 text-xs">
              <p className="font-medium text-zinc-200">{a.type.replace(/_/g, " ")}</p>
              <p className="text-zinc-500">{a.message} — {fmtDate(a.created_at)} ({timeAgo(a.created_at)})</p>
            </div>
          ))}
          {activity.length === 0 && <p className="text-xs text-zinc-600">No activity yet for this lead.</p>}
        </div>
      </div>
    </div>
  );
}
