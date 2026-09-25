"use client";
import { useEffect, useMemo, useState } from "react";
import { useLeads } from "@/lib/crm";
import { exportToCsv } from "@/lib/utils";
import { usePathname } from "next/navigation";

const nav = [
  { label: "Today", href: "/today", keywords: "today operator urgent followups" },
  { label: "Dashboard", href: "/dashboard", keywords: "dashboard metrics pipeline value" },
  { label: "Find Leads", href: "/find-leads", keywords: "find search businesses discover" },
  { label: "Add Lead", href: "/add-leads", keywords: "add create new lead" },
  { label: "Saved Leads", href: "/saved-leads", keywords: "saved crm leads" },
  { label: "Pipeline", href: "/pipeline", keywords: "pipeline kanban stages" },
  { label: "AI Tools", href: "/ai-tools", keywords: "ai score outreach audit proposal" },
  { label: "Demos", href: "/demos", keywords: "demo studio deploy netlify" },
  { label: "Invoices", href: "/invoices", keywords: "invoice payment upi gst" },
  { label: "Revenue", href: "/revenue", keywords: "revenue mrr forecast" },
  { label: "Activity", href: "/activity", keywords: "activity timeline events" },
  { label: "Website Cleanup", href: "/website-cleanup", keywords: "website audit cleanup" },
  { label: "Settings", href: "/settings", keywords: "settings workspace integrations" },
  { label: "Logs", href: "/logs", keywords: "logs jobs" },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/** Lightweight natural-language command parsing. */
function nlAction(q: string): { label: string; href: string } | null {
  const s = q.toLowerCase().trim();
  let m = s.match(/find\s+(.+?)\s+in\s+(.+)/);
  if (m) return { label: `Find ${m[1]} in ${m[2]}`, href: `/find-leads?q=${encodeURIComponent(m[1])}&area=${encodeURIComponent(m[2])}` };
  if (/hot leads.*(no|without).*website|without websites/.test(s)) return { label: "Show hot leads without websites", href: "/saved-leads?filter=hot-no-website" };
  if (/today'?s hot leads|hot leads today/.test(s)) return { label: "Open Today's hot leads", href: "/today" };
  if (/generate outreach.*hot/.test(s)) return { label: "Generate outreach for hot leads", href: "/ai-tools?op=outreach" };
  m = s.match(/open\s+(.+)/);
  if (m) return { label: `Open ${m[1]}`, href: `/saved-leads?q=${encodeURIComponent(m[1])}` };
  if (/export.*(all|leads|csv)/.test(s)) return { label: "Export all leads (CSV)", href: "#export-csv" };
  if (/add lead/.test(s)) return { label: "Add lead", href: "/add-leads" };
  if (/score leads/.test(s)) return { label: "Score leads", href: "/ai-tools?op=enrich" };
  if (/audit/.test(s)) return { label: "Generate audit", href: "/website-cleanup" };
  if (/proposal/.test(s)) return { label: "Generate proposal", href: "/ai-tools?op=proposal" };
  if (/demo/.test(s) && /deploy/.test(s)) return { label: "Deploy demo", href: "/demos" };
  if (/demo/.test(s)) return { label: "Create demo", href: "/demos" };
  if (/invoice/.test(s)) return { label: "Create invoice", href: "/invoices" };
  if (/pipeline/.test(s)) return { label: "Open Pipeline", href: "/pipeline" };
  if (/today/.test(s)) return { label: "Open Today", href: "/today" };
  if (/settings/.test(s)) return { label: "Open Settings", href: "/settings" };
  return null;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const leads = useLeads();
  const pathname = usePathname();
  const embedded = (pathname?.startsWith("/tooth-medic") || pathname?.startsWith("/sites")) ?? false;

  useEffect(() => {
    if (embedded) return;
    const fn = (e: KeyboardEvent) => {
      // Never hijack typing in inputs/textareas/selects.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); return; }
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "/" && !isTypingTarget(e.target) && !open) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, embedded]);

  const results = useMemo(() => {
    const s = q.toLowerCase();
    const n = nav.filter((x) => (x.label + " " + x.keywords).toLowerCase().includes(s)).map((x) => ({ type: "nav" as const, label: x.label, href: x.href }));
    const l = leads.filter((x) => `${x.name} ${x.city} ${x.category}`.toLowerCase().includes(s)).slice(0, 6).map((x) => ({ type: "lead" as const, label: x.name, sub: `${x.category} · ${x.city}`, href: `/saved-leads?q=${encodeURIComponent(x.name)}` }));
    const actions = [
      { type: "action" as const, label: "Add new lead", href: "/add-leads" },
      { type: "action" as const, label: "Export CSV", href: "#export-csv" },
      { type: "action" as const, label: "Export JSON", href: "#export-json" },
      { type: "action" as const, label: "Go to pipeline", href: "/pipeline" },
      { type: "action" as const, label: "Generate outreach", href: "/ai-tools?op=outreach" },
      { type: "action" as const, label: "Generate audit", href: "/website-cleanup" },
      { type: "action" as const, label: "Generate proposal", href: "/ai-tools?op=proposal" },
      { type: "action" as const, label: "Create demo", href: "/demos" },
      { type: "action" as const, label: "Create invoice", href: "/invoices" },
      { type: "action" as const, label: "Open Today", href: "/today" },
      { type: "action" as const, label: "Open Settings", href: "/settings" },
    ].filter((x) => x.label.toLowerCase().includes(s));
    const nl = q.trim().length > 3 ? nlAction(q) : null;
    const nlRow = nl ? [{ type: "nl" as const, label: nl.label, href: nl.href }] : [];
    return [...nlRow, ...n, ...l, ...actions];
  }, [q, leads]);

  useEffect(() => setIdx(0), [q]);

  if (embedded || !open) return null;
  const go = (href: string, label: string) => {
    if (href === "#export-csv") exportToCsv(leads);
    else if (href === "#export-json") {
      const blob = new Blob([JSON.stringify(leads, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "jarvis-leads.json"; a.click();
      URL.revokeObjectURL(a.href);
    } else { setRecent((r) => [label, ...r.filter((x) => x !== label)].slice(0, 4)); window.location.href = href; }
    setOpen(false);
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 p-4" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Command center">
      <div className="mx-auto mt-24 w-full max-w-lg overflow-hidden rounded-xl border border-[#27272A] bg-[#121215] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
            if (e.key === "Enter" && results[idx]) go(results[idx].href, results[idx].label);
          }}
          placeholder='Try "Find dental clinics in Kukatpally"…' aria-label="Command input" className="w-full border-b border-[#27272A] bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
        <div className="max-h-72 overflow-y-auto p-1.5" role="listbox">
          {!q && recent.length > 0 && <p className="px-2 pt-1 text-[10px] uppercase tracking-widest text-zinc-600">Recent — {recent.join(" · ")}</p>}
          {results.map((r, i) => (
            <button key={`${r.type}-${r.label}-${i}`} role="option" aria-selected={i === idx} onClick={() => go(r.href, r.label)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] ${i === idx ? "bg-[#27272A] text-zinc-50" : "text-zinc-400"}`}>
              <span>{r.label}</span>
              <span className="text-[10px] uppercase text-zinc-600">{r.type}{"sub" in r && r.sub ? ` · ${r.sub}` : ""}</span>
            </button>
          ))}
          {results.length === 0 && <p className="p-4 text-center text-xs text-zinc-500">No results</p>}
        </div>
        <div className="border-t border-[#27272A] px-3 py-1.5 text-[10px] text-zinc-600">↑↓ navigate · Enter open · Esc close</div>
      </div>
    </div>
  );
}
export { default as Link } from "next/link";
