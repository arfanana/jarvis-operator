"use client";
import { useEffect, useState } from "react";
import { hydrateEventsFromServer, useActivity, type LeadEvent } from "@/lib/activity";
import { timeAgo } from "@/lib/utils";
import { dataMode } from "@/lib/data-mode";
import { apiFetch } from "@/lib/supabase";

export default function ActivityPage() {
  const local = useActivity();
  const [server, setServer] = useState<LeadEvent[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState<string | null>(null);
  const mode = dataMode();

  useEffect(() => {
    if (mode !== "supabase") return;
    apiFetch("/api/activity?pageSize=100").then(async (r) => {
      if (!r.ok) {
        let detail = `server ${r.status}`;
        try {
          const j = (await r.json()) as { error?: { code?: string; message?: string } };
          if (j.error?.message) detail = `${j.error.code ?? "error"}: ${j.error.message}`;
        } catch { /* keep status */ }
        setErr(r.status === 401 ? "Signed out — please sign in again." : `Could not load persisted activity (${detail}).`);
        return;
      }
      const j = await r.json();
      if (Array.isArray(j.rows)) {
        const rows = (j.rows as Record<string, unknown>[]).map((e) => ({
          id: String(e.id), lead_id: (e.lead_id as string) ?? null,
          type: String(e.type), message: String(e.message ?? ""), created_at: String(e.created_at),
        })) as LeadEvent[];
        setServer(rows);
        hydrateEventsFromServer(rows);
      }
    }).catch(() => setErr("Could not load persisted activity."));
  }, [mode]);

  const events = server ?? local;
  const rows = events.filter((e) => filter === "all" || e.type === filter);
  const types = ["all", ...Array.from(new Set(events.map((e) => e.type)))];
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Workspace</p>
      <h1 className="flex items-center gap-2 text-[26px] font-semibold tracking-tight text-zinc-50">
        Activity
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${mode === "supabase" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-amber-500/40 bg-amber-500/15 text-amber-300"}`}>
          {mode === "supabase" ? "PERSISTED" : "LOCAL"}
        </span>
      </h1>
      {err && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950 px-3 py-1.5 text-xs text-rose-200">{err}</p>}
      <div className="flex items-center gap-2 text-xs">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Event filter" className="rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-zinc-200">
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-zinc-500">{rows.length} events</span>
      </div>
      {rows.length === 0 && <p className="rounded-xl border border-dashed border-[#27272A] bg-[#121215] p-6 text-center text-sm text-zinc-500">No activity yet. Create, move, message or audit a lead and it will appear here.</p>}
      <ul className="space-y-1.5">
        {rows.map((e) => (
          <li key={e.id} className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] px-3 py-2 text-xs">
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-semibold text-zinc-200">{e.type.replace(/_/g, " ")}</span>
            <span className="ml-2 text-zinc-400">{e.message}</span>
            <span className="ml-2 text-[10px] text-zinc-600">{timeAgo(e.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
