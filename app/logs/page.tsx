"use client";
import { useState } from "react";
import { useActivity } from "@/lib/activity";
import { dataMode } from "@/lib/data-mode";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Logs = real persisted activity events. No simulated entries.
export default function LogsPage() {
  const events = useActivity();
  const [filter, setFilter] = useState("");
  const mode = dataMode();
  const rows = events.filter((e) =>
    !filter || `${e.type} ${e.message}`.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <h1 className="flex items-center gap-2 text-base font-bold">
        Logs
        <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
          mode === "supabase" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-amber-500/40 bg-amber-500/15 text-amber-300")}>
          {mode === "supabase" ? "PERSISTED EVENTS" : "LOCAL EVENTS"}
        </span>
      </h1>
      <p className="text-xs text-muted">Every row below is a real event created by an action in this workspace. Nothing here is simulated.</p>
      <div className="flex items-center gap-2 text-xs">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter events…" aria-label="Filter events"
          className="w-56 rounded border border-border bg-panel px-2 py-1.5" />
        <span className="ml-auto text-muted">{rows.length} events</span>
      </div>
      <div className="overflow-auto rounded border border-border bg-panel">
        <table className="dense-table w-full"><thead><tr><th>Type</th><th>Message</th><th>Time</th></tr></thead>
          <tbody>
            {rows.map((l) => <tr key={l.id}><td><span className="rounded bg-white/5 px-1.5 py-0.5 text-2xs font-semibold">{l.type.replace(/_/g, " ")}</span></td><td className="whitespace-normal">{l.message}</td><td className="text-muted">{timeAgo(l.created_at)}</td></tr>)}
            {rows.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-xs text-zinc-500">No events yet — actions across the app create log entries here.</td></tr>}
          </tbody></table>
      </div>
    </div>
  );
}
