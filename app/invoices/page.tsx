"use client";
import { useMemo, useState } from "react";
import { useLeads } from "@/lib/crm";
import { calcInvoice, nextInvoiceNumber, upiLink, type InvoiceLine } from "@/lib/lead-utils";
import { logEvent } from "@/lib/activity";
import { fmtMoney } from "@/lib/utils";
import { isDemoMode } from "@/lib/data-mode";

type InvStatus = "draft" | "sent" | "partial" | "paid" | "overdue";
interface Invoice { id: string; number: string; leadId: string; lines: InvoiceLine[]; discount: number; gstEnabled: boolean; gstRate: number; status: InvStatus; issueDate: string; dueDate: string; upiVpa: string; notes: string; }

function loadInv(): Invoice[] {
  if (!isDemoMode()) return [];
  try { return JSON.parse(localStorage.getItem("jarvis-invoices") ?? "[]"); } catch { return []; }
}

export default function InvoicesPage() {
  const leads = useLeads();
  const [invoices, setInvoices] = useState<Invoice[]>(loadInv);
  const [leadId, setLeadId] = useState("");
  const [upiVpa, setUpiVpa] = useState("merchant@upi");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const lead = leads.find((l) => l.id === leadId) ?? leads[0];

  const persist = (ns: Invoice[]) => { setInvoices(ns); if (!isDemoMode()) return; try { localStorage.setItem("jarvis-invoices", JSON.stringify(ns)); } catch { /* noop */ } };

  const create = () => {
    if (!lead) return;
    const inv: Invoice = {
      id: `i${Date.now()}`, number: nextInvoiceNumber(), leadId: lead.id,
      lines: [{ label: `Website + booking funnel — ${lead.name}`, qty: 1, rate: lead.deal_value ?? 4500 }],
      discount, gstEnabled, gstRate, status: "draft",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
      upiVpa, notes: "Payment due in 7 days. UPI preferred.",
    };
    persist([inv, ...invoices]);
    logEvent(lead.id, "invoice_created", `Invoice ${inv.number} created (${fmtMoney(calcInvoice(inv.lines, inv).total)})`);
    setMsg(`Invoice ${inv.number} created.`);
  };

  const totals = useMemo(() => {
    const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + calcInvoice(i.lines, i).total, 0);
    const out = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + calcInvoice(i.lines, i).total, 0);
    return { paid, out, n: invoices.length };
  }, [invoices]);

  const inp = "rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-xs text-zinc-100 outline-none";
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Revenue</p>
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Invoices</h1>
      <p className="text-xs text-zinc-500">Paid {fmtMoney(totals.paid)} · Outstanding {fmtMoney(totals.out)} · {totals.n} invoices. GST only applies when you enable it. QR is generated locally from the UPI link — nothing is sent to third parties.</p>
      {msg && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-1.5 text-xs text-emerald-200">{msg}</p>}
      {!lead ? <p className="text-xs text-zinc-500">No leads yet.</p> : (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3 text-xs">
          <label className="text-zinc-500">Lead
            <select value={lead.id} onChange={(e) => setLeadId(e.target.value)} className={`${inp} ml-2`}>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          </label>
          <label className="text-zinc-500">UPI VPA <input value={upiVpa} onChange={(e) => setUpiVpa(e.target.value)} className={`${inp} ml-2 w-40`} /></label>
          <label className="flex items-center gap-1 text-zinc-400"><input type="checkbox" checked={gstEnabled} onChange={(e) => setGstEnabled(e.target.checked)} /> GST applies</label>
          {gstEnabled && <label className="text-zinc-500">Rate % <input type="number" value={gstRate} onChange={(e) => setGstRate(+e.target.value)} className={`${inp} ml-1 w-16`} /></label>}
          <label className="text-zinc-500">Discount ₹ <input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} className={`${inp} ml-1 w-24`} /></label>
          <button onClick={create} className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white">New invoice</button>
        </div>
      )}
      <div className="space-y-2">
        {invoices.map((inv) => (
          <InvoiceCard key={inv.id} inv={inv} invoices={invoices} persist={persist} leads={leads} />
        ))}
        {invoices.length === 0 && <p className="rounded-xl border border-dashed border-[#27272A] p-6 text-center text-xs text-zinc-500">No invoices yet.</p>}
      </div>
    </div>
  );
}

function InvoiceCard({ inv, invoices, persist, leads }: { inv: Invoice; invoices: Invoice[]; persist: (ns: Invoice[]) => void; leads: ReturnType<typeof useLeads> }) {
  const c = calcInvoice(inv.lines, inv);
  const l = leads.find((x) => x.id === inv.leadId);
  const upi = upiLink({ payeeVpa: inv.upiVpa, payeeName: l?.name, amount: c.total, note: inv.number });
  const [qr, setQr] = useState<string | null>(null);
  const [qrErr, setQrErr] = useState<string | null>(null);
  const inp = "rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-xs text-zinc-100 outline-none";

  const loadQr = async () => {
    setQrErr(null);
    try {
      const { apiFetch } = await import("@/lib/supabase");
      const r = await apiFetch("/api/invoices/qr", { method: "POST", body: JSON.stringify({ upiUri: upi }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message ?? "QR failed.");
      setQr(j.dataUrl);
    } catch (e) { setQrErr(e instanceof Error ? e.message : "QR failed."); }
  };

  const printPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${inv.number}</title><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;max-width:640px;margin:24px auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px;text-align:left}h1{font-size:20px}</style></head><body><h1>Invoice ${inv.number}</h1><p>Issued ${inv.issueDate} · Due ${inv.dueDate} · Status ${inv.status}</p><p>Bill to: ${(l?.name ?? "").replace(/</g, "&lt;")}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${inv.lines.map((x) => `<tr><td>${x.label.replace(/</g, "&lt;")}</td><td>${x.qty}</td><td>${x.rate}</td><td>${x.qty * x.rate}</td></tr>`).join("")}</tbody></table><p>Subtotal ${c.subtotal} · Discount ${c.discount}${inv.gstEnabled ? ` · GST ${inv.gstRate}% = ${c.gstAmount}` : ""} · <b>Total ${c.total}</b></p><p>${inv.notes.replace(/</g, "&lt;")}</p><p>Pay via UPI: ${upi.replace(/</g, "&lt;")}</p>${qr ? `<img src="${qr}" width="180" alt="UPI QR">` : "<p><i>QR not generated — open the invoice and tap Show QR first.</i></p>"}</body></html>`);
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 400);
  };

  return (
    <div className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-zinc-100">{inv.number}</b>
        <span className="text-zinc-500">{l?.name ?? inv.leadId} · issued {inv.issueDate} · due {inv.dueDate}</span>
        <select value={inv.status} aria-label="Invoice status" onChange={(e) => {
          const ns = invoices.map((x) => x.id === inv.id ? { ...x, status: e.target.value as InvStatus } : x);
          persist(ns);
          logEvent(inv.leadId, e.target.value === "paid" ? "payment_recorded" : "invoice_created", `Invoice ${inv.number} → ${e.target.value}`);
        }} className={inp}>
          {(["draft", "sent", "partial", "paid", "overdue"] as const).map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="ml-auto font-bold text-zinc-100">{fmtMoney(c.total)}</span>
      </div>
      <p className="mt-1 text-zinc-400">{inv.lines.map((x) => `${x.label} ×${x.qty} @ ₹${x.rate}`).join("; ")} · subtotal {fmtMoney(c.subtotal)} · discount {fmtMoney(c.discount)}{inv.gstEnabled ? ` · GST ${inv.gstRate}% = ${fmtMoney(c.gstAmount)}` : " · GST not applicable"} · {inv.notes}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-all text-zinc-500">UPI: {upi}</p>
          <div className="mt-1 flex gap-2">
            <button onClick={loadQr} className="rounded-lg border border-[#27272A] px-2 py-1 text-zinc-300">Show QR</button>
            <button onClick={printPdf} className="rounded-lg border border-[#27272A] px-2 py-1 text-zinc-300">Print / PDF</button>
          </div>
          {qrErr && <p role="alert" className="mt-1 text-rose-300">{qrErr}</p>}
        </div>
        {qr && <img src={qr} alt={`UPI payment QR for invoice ${inv.number}`} width={120} height={120} className="rounded-lg border border-[#27272A] bg-white p-1" />}
      </div>
    </div>
  );
}
