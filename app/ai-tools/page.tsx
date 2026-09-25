"use client";
import { useState } from "react";
import Link from "next/link";
import { useLeads } from "@/lib/crm";
import { logEvent, useActivity } from "@/lib/activity";
import { classifyReply } from "@/lib/ai";
import { apiFetch } from "@/lib/supabase";
import { apiErrorMessage } from "@/lib/data-mode";

const OPS = [
  { id: "outreach", label: "Draft Outreach" },
  { id: "enrich", label: "Enrich Lead" },
  { id: "proposal", label: "Generate Proposal" },
  { id: "followup", label: "Generate Follow-up" },
  { id: "demo", label: "Generate Demo Content" },
  { id: "summarize", label: "Summarize Lead" },
  { id: "next_action", label: "Recommend Next Action" },
  { id: "audit", label: "Website Audit (AI)" },
] as const;

type Op = (typeof OPS)[number]["id"];

export default function AIToolsPage() {
  const leads = useLeads();
  const [op, setOp] = useState<Op>("outreach");
  const [leadId, setLeadId] = useState("");
  const [tone, setTone] = useState("direct, professional");
  const [language, setLanguage] = useState("English");
  const [channel, setChannel] = useState("email");
  const [out, setOut] = useState("");
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [history, setHistory] = useState<{ op: string; lead: string; at: string }[]>([]);
  const [reply, setReply] = useState("");
  const activity = useActivity(leadId || undefined);

  const lead = leads.find((l) => l.id === leadId) ?? leads[0];
  const inp = "rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-xs text-zinc-100 outline-none";

  const run = async () => {
    setBusy(true); setErr(null); setOut("");
    try {
      const targets = bulk ? leads.slice(0, 5) : lead ? [lead] : [];
      if (!targets.length) { setErr("No leads — add one first."); return; }
      const parts: string[] = [];
      for (const t of targets) {
        const r = await apiFetch("/api/ai/generate", {
          method: "POST",
          body: JSON.stringify({ op, lead: t, tone, language, channel }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(apiErrorMessage(j, "AI failed."));
        parts.push(`### ${t.name}\n${j.text ?? ""}\n(model: ${j.model ?? "?"} · ${j.provider ?? "?"} · prompt ${j.promptVersion ?? "jarvis-ai-v1"})`);
        logEvent(t.id, op === "outreach" || op === "followup" ? "outreach_generated" : op === "proposal" ? "proposal_generated" : op === "demo" ? "demo_generated" : op === "audit" ? "audit_generated" : "lead_updated", `AI ${op} generated (${tone}, ${language})`);
        setHistory((h) => [{ op, lead: t.name, at: new Date().toLocaleTimeString() }, ...h].slice(0, 20));
      }
      setOut(parts.join("\n\n---\n\n"));
      setMeta(`${targets.length} lead(s) · tone ${tone} · ${language}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "AI operation failed.");
    } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(out); setMeta((m) => m + " · copied"); } catch { /* noop */ }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Operations</p>
        <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">AI tools</h1>
        <p className="text-[13px] text-zinc-500">Server-executed via AI_PROVIDER. Keys never touch the browser. Known facts vs assumptions are labelled.</p>
      </div>
      {!lead ? (
        <p className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] py-8 text-center text-xs text-zinc-500">
          No leads in the CRM yet — <Link href="/find-leads" className="font-medium text-blue-400 hover:underline">find leads</Link> or{" "}
          <Link href="/add-leads" className="font-medium text-blue-400 hover:underline">add one</Link> first.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Operation</p>
            <div className="grid gap-1">
              {OPS.map((o) => (
                <button key={o.id} onClick={() => setOp(o.id)} aria-pressed={op === o.id}
                  className={op === o.id ? "rounded-lg bg-white/10 px-3 py-1.5 text-left text-xs font-medium text-zinc-100" : "rounded-lg px-3 py-1.5 text-left text-xs text-zinc-500 hover:bg-white/5"}>{o.label}</button>
              ))}
            </div>
            <div className="space-y-2 pt-2">
              <label className="block text-[11px] text-zinc-500">Lead
                <select value={lead.id} onChange={(e) => setLeadId(e.target.value)} className={`${inp} mt-1 w-full`}>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              <label className="block text-[11px] text-zinc-500">Tone
                <select value={tone} onChange={(e) => setTone(e.target.value)} className={`${inp} mt-1 w-full`}>
                  {["direct, professional", "friendly, warm", "formal", "short, punchy"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="block text-[11px] text-zinc-500">Language
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`${inp} mt-1 w-full`}>
                  {["English", "Hindi", "Hinglish", "Telugu", "Tamil"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              {(op === "outreach") && (
                <label className="block text-[11px] text-zinc-500">Channel
                  <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${inp} mt-1 w-full`}>
                    <option value="email">Email</option><option value="whatsapp">WhatsApp</option>
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 text-[11px] text-zinc-400"><input type="checkbox" checked={bulk} onChange={(e) => setBulk(e.target.checked)} /> Bulk (first 5 leads)</label>
              <button onClick={run} disabled={busy} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-400">{busy ? "Running…" : "Run operation"}</button>
              {err && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950 p-2 text-xs text-rose-200">{err}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-200">Output {meta && <span className="font-normal text-zinc-500">· {meta}</span>}</p>
                {out && <div className="flex gap-1"><button onClick={copy} className="rounded-lg border border-[#27272A] px-2 py-1 text-xs text-zinc-300">Copy</button><button onClick={run} className="rounded-lg border border-[#27272A] px-2 py-1 text-xs text-zinc-300">Regenerate</button></div>}
              </div>
              {!out && !busy && <p className="py-6 text-center text-xs text-zinc-500">Pick an operation and hit Run. Results distinguish known facts from assumptions.</p>}
              {busy && <p role="status" className="py-6 text-center text-xs text-zinc-400">Running {op}…</p>}
              {out && <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-[#1c1c21] bg-[#121215] p-3 text-xs leading-relaxed text-zinc-200">{out}</pre>}
            </div>
            <div className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
              <p className="text-xs font-semibold text-zinc-200">Reply classifier (local, instant)</p>
              <div className="mt-2 flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste prospect reply…" aria-label="Prospect reply" className="flex-1 rounded-lg border border-[#1c1c21] bg-[#121215] p-2 text-xs text-zinc-100 outline-none" />
                <button onClick={() => reply && alert(JSON.stringify(classifyReply(reply), null, 2))} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">Classify</button>
              </div>
            </div>
            {(history.length > 0 || activity.length > 0) && (
              <div className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
                <p className="text-xs font-semibold text-zinc-200">Version history / activity</p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                  {history.map((h, i) => <li key={i}>• {h.op} — {h.lead} · {h.at}</li>)}
                  {activity.slice(0, 5).map((a) => <li key={a.id}>• {a.type} — {a.message}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
