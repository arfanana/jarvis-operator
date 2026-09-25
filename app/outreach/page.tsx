"use client";
import { useState } from "react";
import { useLeads } from "@/lib/crm";
import { DEFAULT_SEQUENCE, outreachTemplates, whatsappLink, type OutreachStatus } from "@/lib/outreach";
import { logEvent } from "@/lib/activity";
import { apiFetch } from "@/lib/supabase";
import { apiErrorMessage, isDemoMode } from "@/lib/data-mode";

interface OutreachRecord { id: string; leadId: string; channel: string; template: string; status: OutreachStatus; at: string; }

function loadRecs(): OutreachRecord[] {
  if (!isDemoMode()) return [];
  try { return JSON.parse(localStorage.getItem("jarvis-outreach") ?? "[]"); } catch { return []; }
}

export default function OutreachPage() {
  const leads = useLeads();
  const [leadId, setLeadId] = useState("");
  const [templateId, setTemplateId] = useState("first-contact");
  const [recs, setRecs] = useState<OutreachRecord[]>(loadRecs);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lead = leads.find((l) => l.id === leadId) ?? leads[0];
  const templates = outreachTemplates(lead?.name, lead?.city, lead?.category);
  const tpl = templates.find((t) => t.id === templateId) ?? templates[0];

  const persist = (ns: OutreachRecord[]) => { setRecs(ns); if (!isDemoMode()) return; try { localStorage.setItem("jarvis-outreach", JSON.stringify(ns.slice(0, 200))); } catch { /* noop */ } };

  const sendEmail = async () => {
    if (!lead?.email) { setMsg("Lead has no email — add one first."); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/api/outreach/send", { method: "POST", body: JSON.stringify({ to: lead.email, subject: tpl.subject, body: tpl.body, leadId: lead.id }) });
      const j = await r.json();
      if (r.ok && j.status === "sent") {
        persist([{ id: `o${Date.now()}`, leadId: lead.id, channel: "email", template: tpl.label, status: "sent", at: new Date().toISOString() }, ...recs]);
        logEvent(lead.id, "email_sent", `Email sent: ${tpl.label}`, { deliveryId: j.deliveryId });
        setMsg(`Sent via server (delivery ${j.deliveryId ?? "—"}).`);
      } else {
        const message = apiErrorMessage(j, "Email failed.");
        persist([{ id: `o${Date.now()}`, leadId: lead.id, channel: "email", template: tpl.label, status: "failed", at: new Date().toISOString() }, ...recs]);
        logEvent(lead.id, "email_failed", message);
        setMsg(message);
      }
    } catch (e) { setMsg(e instanceof Error ? e.message : "Send failed."); }
    finally { setBusy(false); }
  };

  const openWhatsapp = () => {
    if (!lead?.phone) { setMsg("Lead has no phone — add one first."); return; }
    window.open(whatsappLink(lead.phone, tpl.body), "_blank");
    persist([{ id: `o${Date.now()}`, leadId: lead.id, channel: "whatsapp", template: tpl.label, status: "sent", at: new Date().toISOString() }, ...recs]);
    logEvent(lead.id, "whatsapp_opened", `WhatsApp opened: ${tpl.label}`);
    setMsg("WhatsApp opened with prefilled text — you control sending.");
  };

  const copy = async () => { try { await navigator.clipboard.writeText(`${tpl.subject}\n\n${tpl.body}`); setMsg("Copied."); } catch { /* noop */ } };

  const inp = "rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-xs text-zinc-100 outline-none";
  if (!lead) return <p className="py-8 text-center text-xs text-zinc-500">No leads yet.</p>;
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Operations</p>
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Outreach</h1>
      <p className="text-xs text-zinc-500">Email sends server-side. WhatsApp only opens a link — nothing is sent silently. Sequence: {DEFAULT_SEQUENCE.map((s) => `Day ${s.day} ${s.label}`).join(" → ")}.</p>
      {msg && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-1.5 text-xs text-emerald-200">{msg}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
          <label className="block text-[11px] text-zinc-500">Lead
            <select value={lead.id} onChange={(e) => setLeadId(e.target.value)} className={`${inp} mt-1 w-full`}>{leads.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.email ?? "no email"} · {l.phone ?? "no phone"}</option>)}</select>
          </label>
          <label className="block text-[11px] text-zinc-500">Template
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`${inp} mt-1 w-full`}>{templates.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.channel})</option>)}</select>
          </label>
          <p className="text-xs font-medium text-zinc-300">{tpl.subject}</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-[#1c1c21] bg-[#121215] p-2 text-xs text-zinc-200">{tpl.body}</pre>
          <div className="flex gap-2">
            <button onClick={sendEmail} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Send email (server)</button>
            <button onClick={openWhatsapp} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Open WhatsApp</button>
            <button onClick={copy} className="rounded-lg border border-[#27272A] px-3 py-1.5 text-xs text-zinc-300">Copy</button>
          </div>
        </div>
        <div className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
          <p className="text-xs font-semibold text-zinc-200">Tracking</p>
          <ul className="mt-2 max-h-96 space-y-1 overflow-auto text-xs">
            {recs.map((r) => {
              const l = leads.find((x) => x.id === r.leadId);
              return <li key={r.id} className="flex items-center gap-2 rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5"><span className="rounded bg-white/5 px-1.5 py-0.5 font-semibold">{r.status}</span><span className="text-zinc-300">{l?.name ?? r.leadId}</span><span className="text-zinc-500">{r.channel} · {r.template}</span><span className="ml-auto text-[10px] text-zinc-600">{r.at.slice(0, 16).replace("T", " ")}</span></li>;
            })}
            {recs.length === 0 && <li className="py-6 text-center text-zinc-500">No outreach yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
