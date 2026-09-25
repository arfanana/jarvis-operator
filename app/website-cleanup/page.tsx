"use client";
import { useState } from "react";
import { updateLead, useLeads } from "@/lib/crm";
import { logEvent } from "@/lib/activity";
import { apiFetch } from "@/lib/supabase";
import { apiErrorMessage } from "@/lib/data-mode";
import { cn } from "@/lib/utils";
import type { WebsiteStatus } from "@/lib/types";

interface AuditScores { performance: { score: number; detail: string; basis: string }; seo: { score: number; detail: string }; mobile: { score: number; detail: string }; accessibility: { score: number; detail: string }; conversion: { score: number; detail: string }; overall: number; }
interface AuditResult extends Partial<AuditScores> { scores?: AuditScores; httpStatus?: number; finalUrl?: string; error?: string; }

const STATUS_LABEL: Record<WebsiteStatus, string> = {
  functional: "Functional", unreachable: "Unreachable", unknown: "Unknown", no_website: "No website", needs_improvement: "Needs improvement",
};

export default function CleanupPage() {
  const leads = useLeads();
  const [url, setUrl] = useState("https://example.com");
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const runAudit = async () => {
    setBusy(true); setAudit(null);
    try {
      const r = await apiFetch("/api/website/audit", { method: "POST", body: JSON.stringify({ url }) });
      const j = await r.json();
      if (!r.ok) throw new Error(apiErrorMessage(j, "Audit failed."));
      setAudit(j);
    } catch (e) { setAudit({ error: e instanceof Error ? e.message : "Audit failed." }); }
    finally { setBusy(false); }
  };

  const verifyLead = async (id: string, website?: string) => {
    if (!website) {
      updateLead(id, { website_status: "no_website" });
      logEvent(id, "website_checked", "Marked: no website");
      return;
    }
    setVerifyMsg("Verifying…");
    try {
      const r = await apiFetch("/api/website/verify", { method: "POST", body: JSON.stringify({ url: website }) });
      const j = await r.json();
      if (!r.ok) throw new Error(apiErrorMessage(j, "Check failed."));
      const st: WebsiteStatus = j.status ?? "unknown";
      updateLead(id, { website_status: st });
      logEvent(id, "website_checked", `Website ${st} (HTTP ${j.httpStatus ?? "—"})`);
      setVerifyMsg(`Checked: ${st}`);
    } catch (e) { setVerifyMsg(e instanceof Error ? e.message : "Check failed."); }
  };

  return (
    <div className="space-y-3">
      <h1 className="text-base font-bold">Website Cleanup <span className="text-xs font-normal text-muted">measured audit · never auto-deletes</span></h1>
      <p className="text-xs text-muted">Leads are never deleted because a site is reachable. Verify each site, then archive manually with confirmation.</p>
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" aria-label="Website URL" className="w-full max-w-md rounded border border-border bg-panel px-3 py-1.5 text-xs" />
        <button onClick={runAudit} disabled={busy} className="rounded bg-sky-700 px-3 py-1.5 text-xs font-medium disabled:opacity-60">{busy ? "Auditing…" : "Audit"}</button>
      </div>
      {audit && (
        <div className="space-y-2">
          {audit.error && <p role="alert" className="rounded border border-rose-800 bg-rose-950 p-2 text-xs">{audit.error}</p>}
          {audit.scores && (
            <>
              <p className="text-xs">Overall <b>{audit.scores.overall}/100</b> · HTTP {audit.httpStatus} · {audit.finalUrl}</p>
              {([["performance", audit.scores.performance], ["seo", audit.scores.seo], ["mobile", audit.scores.mobile], ["accessibility", audit.scores.accessibility], ["conversion", audit.scores.conversion]] as const).map(([k, s]) => (
                <div key={k} className="rounded border border-border bg-panel p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold capitalize">
                    <span className={cn("inline-block h-2 w-2 rounded-full", s.score >= 70 ? "bg-emerald-500" : s.score >= 45 ? "bg-amber-500" : "bg-red-500")} />{k} · {s.score}
                    <span className="font-normal text-muted">· {"basis" in s ? (s as { basis: string }).basis : "Measured"}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">{s.detail}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      <div className="rounded border border-border bg-panel p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold">Lead website status</h2>
          {verifyMsg && <span role="status" className="text-xs text-muted">{verifyMsg}</span>}
        </div>
        <div className="max-h-64 space-y-1 overflow-auto">
          {leads.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded border border-border bg-base px-2 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate">{l.name} <span className="text-muted">· {l.website ?? "no site"}</span></span>
              <span className="rounded-md border border-border px-1.5 py-0.5 text-2xs">{STATUS_LABEL[l.website_status ?? (l.website ? "unknown" : "no_website")]}</span>
              <button onClick={() => verifyLead(l.id, l.website)} className="rounded border border-border px-2 py-0.5 text-2xs hover:bg-white/5">Verify</button>
            </div>
          ))}
          {leads.length === 0 && <p className="py-4 text-center text-xs text-muted">No leads yet.</p>}
        </div>
      </div>
    </div>
  );
}
