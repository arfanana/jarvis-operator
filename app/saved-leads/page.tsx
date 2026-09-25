"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearLeads, removeLeads, updateLead, useLeads } from "@/lib/crm";
import { cn, downloadCSV } from "@/lib/utils";
import { scoreBreakdownFor } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";
import { leadsToCSV, leadsToJSON, leadsToPrintableHTML, opportunityScoreFor } from "@/lib/lead-utils";
import { logEvent } from "@/lib/activity";
import { LeadDrawer } from "@/components/lead-drawer";
import type { Lead } from "@/lib/types";

export default function SavedLeadsPage() {
  return (
    <Suspense fallback={<p className="text-xs text-zinc-500">Loading…</p>}>
      <SavedLeadsInner />
    </Suspense>
  );
}

function SavedLeadsInner() {
  const leads = useLeads();
  const params = useSearchParams();
  const preset = params.get("filter") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<"score" | "name" | "value">("score");
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [view, setView] = useState<Lead | null>(null);
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 2500); };

  const rows = useMemo(() => {
    let r = leads.filter((l) => (!q || (l.name + l.category + l.city).toLowerCase().includes(q.toLowerCase())) && (status === "all" || l.status === status) && opportunityScoreFor(l).score >= minScore);
    if (preset === "hot-no-website") r = r.filter((l) => opportunityScoreFor(l).score >= 70 && !l.website);
    r = [...r].sort((a, b) => (sort === "score" ? opportunityScoreFor(b).score - opportunityScoreFor(a).score : sort === "value" ? (b.deal_value ?? 0) - (a.deal_value ?? 0) : a.name.localeCompare(b.name)));
    return r;
  }, [leads, q, status, minScore, sort, preset]);

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const bulkStatus = (st: string, label: string) => {
    sel.forEach((id) => { updateLead(id, { status: st as never }); logEvent(id, "stage_changed", `Stage → ${st}`); });
    flash(`${label}: ${sel.length}`); setSel([]);
  };
  const bulkDelete = () => {
    if (!window.confirm(`Delete ${sel.length} leads? This cannot be undone.`)) return;
    removeLeads(sel); flash(`Deleted ${sel.length}`); setSel([]);
  };
  const clearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearLeads(); setSel([]); setConfirmClear(false); flash("All leads deleted.");
  };

  const exportCSV = (subset: typeof rows, name: string) => {
    downloadCSV(name, JSON.parse(JSON.stringify(subset.map((l) => ({
      id: l.id, name: l.name, category: l.category, city: l.city, region: l.region, status: l.status,
      opportunity_score: opportunityScoreFor(l).score, phone: l.phone, email: l.email, website: l.website,
      website_status: l.website_status, rating: l.rating, reviews: l.reviewCount, deal_value: l.deal_value,
      follow_up: l.next_follow_up ?? l.nextFollowUp, created_at: l.created_at, source: l.source,
    })))));
    flash(`Exported ${subset.length} leads to ${name}.`);
  };
  const exportJSON = (subset: typeof rows, name: string) => {
    const blob = new Blob([leadsToJSON(subset)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    URL.revokeObjectURL(a.href);
    flash(`Exported ${subset.length} leads to ${name}.`);
  };
  const exportPDF = (subset: typeof rows) => {
    const w = window.open("", "_blank");
    if (!w) { flash("Popup blocked — allow popups to export PDF."); return; }
    w.document.write(leadsToPrintableHTML(subset));
    w.document.close();
    w.focus();
    window.setTimeout(() => { w.print(); }, 400);
    flash(`Opened print view for ${subset.length} filtered leads — use Save as PDF.`);
  };
  void leadsToCSV;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Workspace</p>
          <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Saved leads</h1>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => exportCSV(rows, "jarvis-leads.csv")} title="Export filtered leads to CSV" className="rounded-lg border border-[#1c1c21] bg-[#0c0c0f] px-3 py-1.5 text-[12px] text-zinc-300 hover:border-[#2a2a30] focus-visible:ring-2 focus-visible:ring-blue-500">Export CSV</button>
          <button onClick={() => exportJSON(rows, "jarvis-leads.json")} title="Export filtered leads to JSON" className="rounded-lg border border-[#1c1c21] bg-[#0c0c0f] px-3 py-1.5 text-[12px] text-zinc-300 hover:border-[#2a2a30] focus-visible:ring-2 focus-visible:ring-blue-500">Export JSON</button>
          <button onClick={() => exportPDF(rows)} title="Open filtered print view (Save as PDF)" className="rounded-lg border border-[#1c1c21] bg-[#0c0c0f] px-3 py-1.5 text-[12px] text-zinc-300 hover:border-[#2a2a30] focus-visible:ring-2 focus-visible:ring-blue-500">Export PDF</button>
          <button onClick={clearAll} disabled={leads.length === 0}
            title="Permanently delete all leads from this browser"
            className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-[12px] font-medium text-rose-300 hover:bg-rose-950 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-rose-500">{confirmClear ? "Confirm delete all?" : "Delete all leads"}</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-2 text-xs">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/category/city…" aria-label="Search leads"
          className="w-56 rounded-lg border border-[#1c1c21] bg-[#121215] px-2.5 py-1.5 text-zinc-100 outline-none focus:border-blue-500/50" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter" className="rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-zinc-200">
          {["all", "new", "contacted", "replied", "proposal", "proposal_sent", "won", "lost"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="text-zinc-500">Opp ≥ <input type="number" value={minScore} min={0} max={100} aria-label="Minimum opportunity score"
          onChange={(e) => setMinScore(+e.target.value)} className="w-16 rounded-lg border border-[#1c1c21] bg-[#121215] px-1 py-1 text-zinc-100" /></label>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className="rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-zinc-200">
          <option value="score">Sort: opportunity</option><option value="value">Sort: value</option><option value="name">Sort: name</option>
        </select>
        {sel.length > 0 && (
          <span className="flex gap-1">
            <button onClick={() => bulkStatus("contacted", "Marked contacted")} className="rounded-lg border border-[#27272A] px-2 py-1 text-zinc-300 hover:bg-white/5">Contacted ✓</button>
            <button onClick={() => bulkStatus("proposal", "Moved to proposal")} className="rounded-lg border border-[#27272A] px-2 py-1 text-zinc-300 hover:bg-white/5">→ Proposal</button>
            <button onClick={bulkDelete} className="rounded-lg border border-rose-800 px-2 py-1 text-rose-300 hover:bg-rose-950">Delete</button>
            <button onClick={() => exportCSV(leads.filter((l) => sel.includes(l.id)), "selection.csv")} className="rounded-lg border border-[#27272A] px-2 py-1 text-zinc-300 hover:bg-white/5">Export CSV</button>
          </span>
        )}
        <span className="ml-auto text-zinc-500">{rows.length} / {leads.length} leads</span>
      </div>
      {msg && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-1.5 text-xs text-emerald-200">{msg}</p>}
      <div className="overflow-auto rounded-xl border border-[#1c1c21] bg-[#0c0c0f]">
        <table className="dense-table w-full">
          <thead><tr>
            <th><input type="checkbox" aria-label="Select all" checked={sel.length === rows.length && rows.length > 0} onChange={() => setSel(sel.length ? [] : rows.map((r) => r.id))} /></th>
            <th>Lead</th><th>Status</th><th>Opp</th><th>Value</th><th>Follow-up</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="group cursor-pointer" onClick={() => setView(l)}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${l.name}`} checked={sel.includes(l.id)} onChange={() => toggle(l.id)} /></td>
                <td><p className="font-medium text-zinc-100">{l.name}</p><p className="text-2xs text-zinc-500">{l.category} · {l.city}{l.website_status ? ` · ${l.website_status}` : ""}</p></td>
                <td>
                  <span title={`Pipeline stage — currently "${l.status}"`} className={cn("cursor-help rounded-md border px-1.5 py-0.5 text-2xs",
                    l.status === "won" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                    : l.status === "lost" ? "border-rose-500/30 bg-rose-500/15 text-rose-400"
                    : l.status === "proposal_sent" || l.status === "proposal" ? "border-violet-500/30 bg-violet-500/15 text-violet-400"
                    : l.status === "replied" ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-400"
                    : l.status === "contacted" ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
                    : "border-sky-500/30 bg-sky-500/15 text-sky-400")}>{l.status.replace("_", " ")}</span>
                </td>
                <td title={scoreBreakdownFor(l).map((s) => `${s.label} +${s.points} — ${s.detail}`).join("\n")}
                  className="cursor-help font-semibold tabular-nums">{opportunityScoreFor(l).score}</td>
                <td className="tabular-nums">{fmtMoney(l.deal_value ?? 0)}</td>
                <td className="tabular-nums">{(l.next_follow_up ?? l.nextFollowUp ?? "—")?.slice(0, 10)}</td>
                <td><span className="row-actions flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { updateLead(l.id, { status: "replied" }); logEvent(l.id, "reply_recorded", "Reply recorded"); }} className="rounded border border-[#27272A] px-1.5 py-0.5 text-2xs text-zinc-300 hover:bg-white/5">Replied</button>
                  <button onClick={() => { if (window.confirm(`Delete ${l.name}?`)) removeLeads([l.id]); }} className="rounded border border-rose-800 px-1.5 py-0.5 text-2xs text-rose-300">Del</button>
                </span></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-xs text-zinc-500">
                {leads.length === 0 ? "No leads yet — find some on Find leads or add manually." : "No matches — loosen the filters."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <LeadDrawer lead={view ? (leads.find((x) => x.id === view.id) ?? view) : null} onClose={() => setView(null)} />
    </div>
  );
}
