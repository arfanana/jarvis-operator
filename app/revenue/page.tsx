"use client";
import { useMemo } from "react";
import { useLeads } from "@/lib/crm";
import { fmtMoney } from "@/lib/utils";
import { opportunityScoreFor } from "@/lib/lead-utils";

export default function RevenuePage() {
  const leads = useLeads();
  const m = useMemo(() => {
    const open = leads.filter((l) => l.status !== "won" && l.status !== "lost");
    const pipeline = open.reduce((s, l) => s + (l.deal_value ?? 0), 0);
    const weighted = open.reduce((s, l) => s + (l.deal_value ?? 0) * (opportunityScoreFor(l).score / 100), 0);
    const won = leads.filter((l) => l.status === "won").reduce((s, l) => s + (l.deal_value ?? 0), 0);
    const outstanding = leads.filter((l) => l.status === "proposal" || l.status === "proposal_sent").reduce((s, l) => s + (l.deal_value ?? 0), 0);
    const avg = leads.length ? Math.round(pipeline / Math.max(1, open.length)) : 0;
    return { pipeline, weighted, won, outstanding, avg };
  }, [leads]);
  const rows = leads.filter((l) => (l.deal_value ?? 0) > 0).sort((a, b) => (b.deal_value ?? 0) - (a.deal_value ?? 0)).slice(0, 20);
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Revenue</p>
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Revenue</h1>
      <div className="grid gap-3 sm:grid-cols-5">
        {[
          ["Pipeline value", fmtMoney(m.pipeline)],
          ["Weighted", fmtMoney(m.weighted)],
          ["Won revenue", fmtMoney(m.won)],
          ["Outstanding", fmtMoney(m.outstanding)],
          ["Avg deal", fmtMoney(m.avg)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
            <p className="text-2xs uppercase tracking-wide text-zinc-500">{k}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-50">{v}</p>
          </div>
        ))}
      </div>
      <div className="overflow-auto rounded-xl border border-[#1c1c21] bg-[#0c0c0f]">
        <table className="dense-table w-full">
          <thead><tr><th>Lead</th><th>Stage</th><th>Opp</th><th>Value</th></tr></thead>
          <tbody>
            {rows.map((l) => <tr key={l.id}><td>{l.name}</td><td>{l.status}</td><td>{opportunityScoreFor(l).score}</td><td>{fmtMoney(l.deal_value ?? 0)}</td></tr>)}
            {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-xs text-zinc-500">No deals yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-2xs text-zinc-500">Flow: Lead → Proposal → Invoice → Payment. Create invoices on the Invoices page; won stages roll into revenue here.</p>
    </div>
  );
}
