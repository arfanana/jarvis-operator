"use client";
import { useEffect, useMemo, useState } from "react";
import { syncLeadsFromServer, useLeads } from "@/lib/crm";
import { hydrateEventsFromServer, useActivity, type LeadEvent } from "@/lib/activity";
import { fmtMoney, timeAgo } from "@/lib/utils";
import { opportunityScoreFor } from "@/lib/lead-utils";
import { dataMode } from "@/lib/data-mode";
import { apiFetch } from "@/lib/supabase";

const STAGES = ["new", "contacted", "replied", "proposal", "won"] as const;

export default function DashboardPage() {
  const leads = useLeads();
  const events = useActivity();
  const [serverEvents, setServerEvents] = useState<LeadEvent[] | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const mode = dataMode();

  // Supabase mode: hydrate from persisted data (server is truth, with error state).
  useEffect(() => {
    if (mode !== "supabase") return;
    syncLeadsFromServer().then((res) => {
      if (!res.ok) setSyncErr(res.error ?? "Could not load persisted leads — check Supabase configuration.");
    }).catch((e) => setSyncErr(e instanceof Error ? e.message : "Could not load persisted leads."));
    apiFetch("/api/activity?pageSize=50").then(async (r) => {
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j.rows)) {
        const rows = (j.rows as Record<string, unknown>[]).map((e) => ({
          id: String(e.id), lead_id: (e.lead_id as string) ?? null,
          type: String(e.type), message: String(e.message ?? ""), created_at: String(e.created_at),
        })) as LeadEvent[];
        setServerEvents(rows);
        hydrateEventsFromServer(rows);
      }
    }).catch(() => {});
  }, [mode]);

  const m = useMemo(() => {
    const open = leads.filter((l) => l.status !== "won" && l.status !== "lost");
    const pipeline = open.reduce((s, l) => s + (l.deal_value ?? 0), 0);
    const weighted = open.reduce((s, l) => s + (l.deal_value ?? 0) * (opportunityScoreFor(l).score / 100), 0);
    const won = leads.filter((l) => l.status === "won");
    const wonRevenue = won.reduce((s, l) => s + (l.deal_value ?? 0), 0);
    const outstanding = leads.filter((l) => l.status === "proposal" || l.status === "proposal_sent").reduce((s, l) => s + (l.deal_value ?? 0), 0);
    const hot = leads.filter((l) => opportunityScoreFor(l).score >= 70 && l.status === "new").length;
    const today = new Date().toISOString().slice(0, 10);
    const followups = leads.filter((l) => (l.next_follow_up ?? l.nextFollowUp ?? "9999") <= today).length;
    const closed = leads.filter((l) => l.status === "won" || l.status === "lost").length;
    const bySource: Record<string, number> = {};
    leads.forEach((l) => { bySource[l.source ?? "manual"] = (bySource[l.source ?? "manual"] ?? 0) + 1; });
    return { pipeline, weighted, wonRevenue, outstanding, hot, followups, n: leads.length, winRate: closed ? Math.round((won.length / closed) * 100) : 0, avgDeal: leads.length ? Math.round(pipeline / Math.max(1, open.length)) : 0, bySource };
  }, [leads]);

  const max = Math.max(1, ...STAGES.map((s) => leads.filter((l) => l.status === s || (s === "proposal" && l.status === "proposal_sent")).length));
  const shownEvents = serverEvents ?? events;

  const cards = [
    { k: "Pipeline value", v: fmtMoney(m.pipeline), tip: "Open deal value excluding won/lost" },
    { k: "Weighted pipeline", v: fmtMoney(m.weighted), tip: "Deal value × opportunity score" },
    { k: "Won revenue", v: fmtMoney(m.wonRevenue), tip: "Sum of won deals" },
    { k: "Outstanding", v: fmtMoney(m.outstanding), tip: "Proposals awaiting decision" },
    { k: "Hot leads", v: String(m.hot), tip: "Opportunity ≥ 70 and new" },
    { k: "Follow-ups due", v: String(m.followups), tip: "Follow-up date today or earlier" },
    { k: "Win rate", v: m.winRate + "%", tip: "won ÷ (won + lost)" },
    { k: "Avg deal", v: fmtMoney(m.avgDeal), tip: "Pipeline ÷ open leads" },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Workspace</p>
        <h1 className="flex items-center gap-2 text-[26px] font-semibold tracking-tight text-zinc-50">
          Dashboard
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${mode === "supabase" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : mode === "demo" ? "border-amber-500/40 bg-amber-500/15 text-amber-300" : "border-rose-500/40 bg-rose-500/15 text-rose-300"}`}>
            {mode === "supabase" ? "LIVE DATA" : mode === "demo" ? "DEMO DATA" : "NOT CONFIGURED"}
          </span>
        </h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">Every metric is computed from persisted records — no fake numbers.</p>
      </div>
      {mode === "unconfigured" && (
        <p role="alert" className="rounded-xl border border-rose-800 bg-rose-950 p-4 text-center text-xs text-rose-200">
          Persistence is not configured. Set Supabase env vars or NEXT_PUBLIC_DEMO_PERSISTENCE=true for local demo. No data is shown until then.
        </p>
      )}
      {syncErr && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950 px-3 py-1.5 text-xs text-rose-200">{syncErr}</p>}
      {mode !== "unconfigured" && leads.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#27272A] bg-[#121215] p-6 text-center text-sm text-zinc-500">
          No leads yet — metrics appear once you save leads from Find leads or Add leads.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        {cards.map((s) => (
          <div key={s.k} title={s.tip} className="cursor-help rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
            <p className="text-2xs uppercase tracking-wide text-zinc-500">{s.k}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-50">{s.v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3 lg:col-span-1">
          <h2 className="text-xs font-semibold text-zinc-200">Pipeline distribution</h2>
          <div className="mt-2 space-y-1.5">
            {STAGES.map((s) => {
              const n = leads.filter((l) => l.status === s || (s === "proposal" && l.status === "proposal_sent")).length;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-zinc-500">{s}</span>
                  <div className="h-3 flex-1 rounded bg-white/10"><div className="h-3 rounded bg-sky-600" style={{ width: (n / max) * 100 + "%" }} /></div>
                  <span className="w-6 text-right font-semibold tabular-nums">{n}</span>
                </div>
              );
            })}
            {leads.length === 0 && <p className="py-3 text-center text-xs text-zinc-500">No leads yet — save some from Find leads.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
          <h2 className="text-xs font-semibold text-zinc-200">Lead source performance</h2>
          {Object.keys(m.bySource).length === 0 && <p className="py-3 text-center text-xs text-zinc-500">No data yet.</p>}
          <div className="mt-2 space-y-1.5">
            {Object.entries(m.bySource).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-28 text-zinc-500">{k}</span>
                <div className="h-3 flex-1 rounded bg-white/10"><div className="h-3 rounded bg-emerald-600" style={{ width: `${(v / Math.max(1, m.n)) * 100}%` }} /></div>
                <span className="w-6 text-right font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
          <h2 className="text-xs font-semibold text-zinc-200">Recent activity {serverEvents ? "(persisted)" : ""}</h2>
          {shownEvents.length === 0 && <p className="py-3 text-center text-xs text-zinc-500">No activity yet — actions across the app are logged here.</p>}
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-auto text-xs">
            {shownEvents.slice(0, 12).map((e) => (
              <li key={e.id} className="rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5">
                <span className="font-medium text-zinc-300">{e.type.replace(/_/g, " ")}</span>
                <span className="text-zinc-500"> · {e.message}</span>
                <span className="ml-1 text-[10px] text-zinc-600">{timeAgo(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
