"use client";
import { useMemo, useState } from "react";
import { addLeads, buildLead, updateLead, useLeads } from "@/lib/crm";
import { cn, daysSince, fmtMoney } from "@/lib/utils";
import { opportunityScoreFor } from "@/lib/lead-utils";
import { logEvent } from "@/lib/activity";
import type { LeadStatus } from "@/lib/types";

const COLS = ["new", "contacted", "replied", "proposal", "won", "lost"] as const;
type Col = (typeof COLS)[number];

export default function PipelinePage() {
  const store = useLeads();
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState(0);
  const [followupOnly, setFollowupOnly] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<null | Col>(null);
  const [newName, setNewName] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const leads = useMemo(() => {
    return store.filter((l) => {
      if (stageFilter !== "all" && l.status !== stageFilter) return false;
      if (q && !(l.name + l.category + l.city).toLowerCase().includes(q.toLowerCase())) return false;
      if (opportunityScoreFor(l).score < minScore) return false;
      if (followupOnly && (l.next_follow_up ?? l.nextFollowUp ?? "9999") > today) return false;
      return true;
    });
  }, [store, q, stageFilter, minScore, followupOnly, today]);

  const move = (id: string, st: Col) => {
    updateLead(id, { status: st as LeadStatus });
    logEvent(id, "stage_changed", `Stage → ${st}`);
  };

  const createInStage = () => {
    if (newName.trim().length < 2 || !showAdd) return;
    const lead = buildLead({ name: newName.trim(), status: showAdd as LeadStatus });
    addLeads([lead]);
    logEvent(lead.id, "lead_created", `Lead added in ${showAdd}: ${lead.name}`);
    logEvent(lead.id, "stage_changed", `Stage → ${showAdd}`);
    setNewName(""); setShowAdd(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Operations</p>
          <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Pipeline</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500">Drag cards between stages or click → to advance. Every move is logged.</p>
        </div>
        <button onClick={() => setShowAdd("new")} className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400">+ Add lead</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-2 text-xs">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads…" aria-label="Search pipeline" className="w-48 rounded-lg border border-[#1c1c21] bg-[#121215] px-2.5 py-1.5 text-zinc-100 outline-none focus:border-blue-500/50" />
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label="Stage filter" className="rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-zinc-200">
          {["all", ...COLS].map((s) => <option key={s} value={s}>{s === "all" ? "All stages" : s}</option>)}
        </select>
        <label className="text-zinc-500">Opp ≥ <input type="number" aria-label="Minimum opportunity" value={minScore} min={0} max={100} onChange={(e) => setMinScore(+e.target.value)} className="w-16 rounded-lg border border-[#1c1c21] bg-[#121215] px-1 py-1 text-zinc-100" /></label>
        <label className="flex items-center gap-1.5 text-zinc-400"><input type="checkbox" checked={followupOnly} onChange={(e) => setFollowupOnly(e.target.checked)} /> Follow-up due</label>
        <span className="ml-auto text-zinc-500">{leads.length} shown</span>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/5 p-2 text-xs" role="dialog" aria-label="Add lead">
          <span className="text-zinc-400">New lead in <b className="text-zinc-100">{showAdd}</b>:</span>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createInStage()} placeholder="Business name…" aria-label="New lead name" className="flex-1 rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-zinc-100 outline-none" />
          <button onClick={createInStage} className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white">Save</button>
          <button onClick={() => setShowAdd(null)} className="rounded-lg border border-[#27272A] px-2 py-1.5 text-zinc-400">Cancel</button>
        </div>
      )}

      <div className="grid auto-cols-min grid-flow-col gap-3 overflow-x-auto pb-2">
        {COLS.map((c) => {
          const items = leads.filter((l) => l.status === c || (c === "proposal" && l.status === "proposal_sent"));
          const total = items.reduce((s, l) => s + (l.deal_value ?? 0), 0);
          return (
            <div key={c} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) { move(drag, c); setDrag(null); } }}
              className="w-56 shrink-0 overflow-hidden rounded-xl border border-[#1c1c21] bg-[#0c0c0f]">
              <header className="border-b border-[#1c1c21] px-3 py-2">
                <p className="flex items-center justify-between text-xs font-semibold capitalize text-zinc-200">
                  {c}<span className="rounded bg-white/5 px-1.5 text-[10px] text-zinc-400">{items.length}</span>
                </p>
                <p className="mt-0.5 text-2xs tabular-nums text-zinc-500" title={`${fmtMoney(total)} open in this column`}>{fmtMoney(total)} open</p>
              </header>
              <div className="max-h-[480px] space-y-1.5 overflow-y-auto p-2">
                {items.map((l) => {
                  const aging = daysSince(l.created_at) > 14 && c !== "won" && c !== "lost";
                  return (
                    <div key={l.id} draggable onDragStart={() => setDrag(l.id)} className={cn("cursor-grab rounded-lg border border-[#1c1c21] bg-[#121215] p-2 active:cursor-grabbing", aging && "border-l-2 border-l-amber-500")}>
                      <p className="truncate text-xs font-medium text-zinc-100">{l.name}</p>
                      <p className="text-2xs tabular-nums text-zinc-500">
                        {fmtMoney(l.deal_value ?? 0)} · opp {opportunityScoreFor(l).score}{aging && " · AGING"}
                      </p>
                      <div className="mt-1 flex gap-1">
                        <button onClick={() => { const i = COLS.indexOf(c); if (i < COLS.length - 1) move(l.id, COLS[i + 1]); }} title="Advance to next stage" aria-label={`Advance ${l.name}`} className="rounded border border-[#27272A] px-1.5 py-0.5 text-2xs text-zinc-400 hover:text-zinc-100">→</button>
                        <button onClick={() => move(l.id, "lost")} title="Mark lost" aria-label={`Mark ${l.name} lost`} className="rounded border border-rose-900 px-1.5 py-0.5 text-2xs text-rose-400">✕</button>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="px-1 py-4 text-center text-2xs text-zinc-600">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-2xs text-zinc-500">Amber left-border = card older than 14 days and not closed. Drag or click → to advance stage.</p>
    </div>
  );
}
