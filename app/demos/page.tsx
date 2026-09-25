"use client";
import { useMemo, useState } from "react";
import { addLeads, buildLead, saveLeadsToServer, useLeads } from "@/lib/crm";
import { DEMO_TEMPLATES } from "@/lib/demo-templates";
import {
  DEFAULT_DEMO_THEME,
  DEMO_ACCENTS,
  defaultDemoContent,
  parseDemoContent,
  renderDemoSite,
  sanitizeTheme,
  toothMedicSiteContent,
  type DemoSiteContent,
  type DemoTheme,
} from "@/lib/demo-sites";
import { CLINIC } from "@/lib/tooth-medic-content";
import { logEvent } from "@/lib/activity";
import { apiFetch } from "@/lib/supabase";
import { apiErrorMessage, isDemoMode } from "@/lib/data-mode";

interface Deployment { siteId: string; deploymentId: string | null; url: string; at: string; leadId: string; template: string; pages?: string[]; }

const PAGES = [
  { file: "index.html", label: "Home" },
  { file: "services.html", label: "Services" },
  { file: "reviews.html", label: "Reviews" },
  { file: "contact.html", label: "Contact" },
] as const;

type Source = "ai" | "flagship";

export default function DemosPage() {
  const leads = useLeads();
  const [leadId, setLeadId] = useState("");
  const [templateId, setTemplateId] = useState(DEMO_TEMPLATES[0].id);
  const [source, setSource] = useState<Source>("ai");
  const [content, setContent] = useState<DemoSiteContent | null>(null);
  const [theme, setTheme] = useState<DemoTheme>(DEFAULT_DEMO_THEME);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof PAGES)[number]["file"]>("index.html");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>(() => {
    if (!isDemoMode()) return [];
    try { return JSON.parse(localStorage.getItem("jarvis-deployments") ?? "[]"); } catch { return []; }
  });
  const saveDeployments = (ns: Deployment[]) => {
    if (!isDemoMode()) return;
    try { localStorage.setItem("jarvis-deployments", JSON.stringify(ns)); } catch { /* noop */ }
  };
  const lead = leads.find((l) => l.id === leadId) ?? leads[0];
  const template = DEMO_TEMPLATES.find((t) => t.id === templateId) ?? DEMO_TEMPLATES[0];
  const existingForLead = useMemo(() => deployments.filter((d) => d.leadId === lead?.id), [deployments, lead]);
  const safeTheme = useMemo(() => sanitizeTheme(theme), [theme]);
  const pages = useMemo(() => (content ? renderDemoSite(content, safeTheme) : null), [content, safeTheme]);
  const hasToothMedicLead = useMemo(() => leads.some((l) => l.phone === CLINIC.phoneIntl || l.name === CLINIC.name), [leads]);

  const seedToothMedicLead = async () => {
    const l = buildLead({
      name: CLINIC.name, category: "Dental Clinic", city: "Hyderabad", region: "Telangana",
      email: CLINIC.email, phone: CLINIC.phoneDisplay, score: 85, source: "demo-flagship",
    });
    const res = addLeads([l], { sync: false });
    if (res.added.length) {
      logEvent(l.id, "lead_created", `Flagship demo lead saved: ${l.name}`);
      const srv = await saveLeadsToServer(res.added);
      setLeadId(l.id);
      setMsg(srv.ok ? `${l.name} saved — select it above to build its demo.` : `Saved locally, BUT server rejected it: ${srv.error}.`);
    } else {
      setMsg(`Already saved (duplicate: ${res.skipped[0]?.reasons.join(", ")}). Select it above.`);
      const existing = leads.find((x) => x.name === CLINIC.name || x.phone === CLINIC.phoneIntl);
      if (existing) setLeadId(existing.id);
    }
  };

  const loadFlagship = () => {
    if (!lead) return;
    const base = toothMedicSiteContent();
    setContent({ ...base, business: lead.name !== CLINIC.name ? lead.name : base.business });
    setTheme({ ...DEFAULT_DEMO_THEME });
    setAiNote("Tooth Medic flagship content loaded as a reusable template — edit anything, it stays honest (no invented facts).");
    logEvent(lead.id, "demo_generated", "Flagship template loaded for demo");
    setMsg("Flagship template loaded — tweak design below, then deploy.");
  };

  const generate = async () => {
    if (!lead) return;
    if (source === "flagship") { loadFlagship(); return; }
    setBusy(true); setMsg(null);
    const fallback = defaultDemoContent(lead.name, lead.city, lead.phone ?? "", template.category);
    try {
      const r = await apiFetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({ op: "demo", lead, category: template.category }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(apiErrorMessage(j, "Generation failed."));
      setContent(parseDemoContent(j.text ?? "", fallback));
      setAiNote(`AI copy applied (${j.model ?? "?"}). Sample voices are labeled on the site — replace with real reviews before publishing.`);
      logEvent(lead.id, "demo_generated", `Demo content generated (${template.label})`);
      setMsg("Content generated — review each page, edit anything, then deploy.");
    } catch (e) {
      setContent(fallback);
      setAiNote(null);
      setMsg((e instanceof Error ? e.message : "Generation failed.") + " Loaded editable template defaults instead.");
    } finally { setBusy(false); }
  };

  const deploy = async () => {
    if (!lead || !pages) return;
    setBusy(true);
    try {
      const siteId = existingForLead[0]?.siteId;
      const r = await apiFetch("/api/netlify/deploy", { method: "POST", body: JSON.stringify({ siteId, files: pages, leadId: lead.id, title: lead.name }) });
      const j = await r.json();
      if (!r.ok) throw new Error(apiErrorMessage(j, "Deploy failed."));
      const rec: Deployment = { siteId: j.siteId, deploymentId: j.deploymentId, url: j.url, at: j.deployedAt, leadId: lead.id, template: template.label, pages: j.pages ?? Object.keys(pages) };
      const ns = [rec, ...deployments.filter((d) => d.leadId !== lead.id).concat(rec).slice(-20)];
      setDeployments(ns);
      saveDeployments(ns);
      logEvent(lead.id, "demo_deployed", `Deployed ${(j.pages ?? []).length} pages to ${j.url ?? j.siteId}`, { siteId: j.siteId, deploymentId: j.deploymentId });
      setMsg(`Deployed ${(j.pages ?? []).length} pages — ${j.url ?? j.siteId} (deploy ${j.deploymentId ?? "—"})`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Deploy failed."); }
    finally { setBusy(false); }
  };

  const inp = "rounded-lg border border-[#1c1c21] bg-[#121215] px-2 py-1.5 text-xs text-zinc-100 outline-none";
  const set = (patch: Partial<DemoSiteContent>) => setContent((c) => (c ? { ...c, ...patch } : c));
  const setT = (patch: Partial<DemoTheme>) => setTheme((t) => sanitizeTheme({ ...t, ...patch }));

  if (!lead) return <p className="py-8 text-center text-xs text-zinc-500">No leads yet — add one to build a demo.</p>;
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Operations</p>
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Demo Studio</h1>
      <p className="text-xs text-zinc-500">AI writes structured content (never raw HTML), rendered into a restrained 4-page site: Home, Services, Reviews, Contact. No gradients, no emojis, no filler.</p>
      {msg && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-1.5 text-xs text-emerald-200">{msg}</p>}
      {aiNote && <p className="rounded-lg border border-[#27272A] bg-[#121215] px-3 py-1.5 text-xs text-zinc-400">{aiNote}</p>}
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] text-zinc-500">Lead
              <select value={lead.id} onChange={(e) => setLeadId(e.target.value)} className={`${inp} mt-1 w-full`}>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
            </label>
            <label className="block text-[11px] text-zinc-500">Template
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`${inp} mt-1 w-full`}>{DEMO_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-[#09090B] p-1" role="group" aria-label="Content source">
              {(["ai", "flagship"] as const).map((s) => (
                <button key={s} onClick={() => setSource(s)} aria-pressed={source === s}
                  className={source === s ? "rounded-md bg-[#27272A] px-2.5 py-1 text-xs font-medium text-zinc-50" : "rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"}>
                  {s === "ai" ? "AI content" : "Flagship template"}
                </button>
              ))}
            </div>
            {!hasToothMedicLead && (
              <button onClick={seedToothMedicLead} title="Save Tooth Medic as a lead in one click"
                className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">+ Tooth Medic lead</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={generate} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{busy ? "Working…" : content ? "Regenerate" : "Generate"}</button>
            <button onClick={deploy} disabled={busy || !pages} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Deploy 4 pages (reuse site)</button>
          </div>
          {content && (
            <>
              <div className="rounded-xl border border-[#1c1c21] bg-[#121215] p-3">
                <p className="text-[11px] font-semibold text-zinc-200">Design</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Accent color">
                  {DEMO_ACCENTS.map((a) => (
                    <button key={a} onClick={() => setT({ accent: a })} title={a} aria-label={`Accent ${a}`} aria-pressed={safeTheme.accent === a}
                      className={`h-6 w-6 rounded-full border-2 ${safeTheme.accent === a ? "border-white" : "border-transparent"}`} style={{ background: a }} />
                  ))}
                  <input type="color" value={safeTheme.accent} onChange={(e) => setT({ accent: e.target.value })} aria-label="Custom accent color" className="h-6 w-9 cursor-pointer rounded border border-[#27272A] bg-transparent" />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block text-[11px] text-zinc-500">Headings
                    <select value={safeTheme.headingFont} onChange={(e) => setT({ headingFont: e.target.value as DemoTheme["headingFont"] })} className={`${inp} mt-1 w-full`}>
                      <option value="serif">Editorial serif</option><option value="sans">Clean sans</option>
                    </select>
                  </label>
                  <label className="block text-[11px] text-zinc-500">Body text
                    <select value={safeTheme.bodyFont} onChange={(e) => setT({ bodyFont: e.target.value as DemoTheme["bodyFont"] })} className={`${inp} mt-1 w-full`}>
                      <option value="sans">Clean sans</option><option value="serif">Serif</option>
                    </select>
                  </label>
                  <label className="block text-[11px] text-zinc-500">Text size ({safeTheme.baseSize}px)
                    <input type="range" min={14} max={19} step={1} value={safeTheme.baseSize} onChange={(e) => setT({ baseSize: +e.target.value })} aria-label="Base text size" className="mt-1 w-full" />
                  </label>
                  <label className="block text-[11px] text-zinc-500">Corners ({safeTheme.radius}px)
                    <input type="range" min={0} max={16} step={1} value={safeTheme.radius} onChange={(e) => setT({ radius: +e.target.value })} aria-label="Corner radius" className="mt-1 w-full" />
                  </label>
                </div>
              </div>
              <label className="block text-[11px] text-zinc-500">Tagline
                <input value={content.tagline} onChange={(e) => set({ tagline: e.target.value })} className={`${inp} mt-1 w-full`} />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-[11px] text-zinc-500">Phone
                  <input value={content.phone} onChange={(e) => set({ phone: e.target.value })} className={`${inp} mt-1 w-full`} />
                </label>
                <label className="block text-[11px] text-zinc-500">Address
                  <input value={content.address} onChange={(e) => set({ address: e.target.value })} className={`${inp} mt-1 w-full`} />
                </label>
              </div>
              <label className="block text-[11px] text-zinc-500">Intro
                <textarea value={content.intro} onChange={(e) => set({ intro: e.target.value })} rows={2} className={`${inp} mt-1 w-full`} />
              </label>
              <div>
                <p className="text-[11px] font-semibold text-zinc-300">Services ({content.services.length})</p>
                {content.services.map((s, i) => (
                  <div key={i} className="mt-1 grid gap-1 rounded-lg border border-[#1c1c21] bg-[#121215] p-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input value={s.name} aria-label="Service name" onChange={(e) => set({ services: content.services.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} className={inp} />
                    <input value={s.price ?? ""} aria-label="Service price" placeholder="Price" onChange={(e) => set({ services: content.services.map((x, k) => (k === i ? { ...x, price: e.target.value } : x)) })} className={inp} />
                    <button onClick={() => set({ services: content.services.filter((_, k) => k !== i) })} aria-label="Remove service" className="rounded-lg border border-rose-800 px-2 text-xs text-rose-300">✕</button>
                    <input value={s.desc} aria-label="Service description" onChange={(e) => set({ services: content.services.map((x, k) => (k === i ? { ...x, desc: e.target.value } : x)) })} className={`${inp} sm:col-span-3`} />
                  </div>
                ))}
                <button onClick={() => set({ services: [...content.services, { name: "New service", desc: "", price: "" }] })} className="mt-1 rounded-lg border border-[#27272A] px-2 py-1 text-xs text-zinc-300">+ Add service</button>
              </div>
              <label className="block text-[11px] text-zinc-500">About
                <textarea value={content.about} onChange={(e) => set({ about: e.target.value })} rows={2} className={`${inp} mt-1 w-full`} />
              </label>
            </>
          )}
          {deployments.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-zinc-300">Deployment history</p>
              <ul className="mt-1 space-y-1 text-[11px] text-zinc-400">
                {deployments.slice(0, 8).map((d, i) => <li key={i}>• {d.template} · {(d.pages ?? ["index.html"]).length} pages · site {d.siteId} · {d.url || "local"} · {d.at.slice(0, 16).replace("T", " ")}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-[#1c1c21] bg-[#0c0c0f]">
          <div className="flex items-center gap-1 border-b border-[#1c1c21] px-3 py-2">
            <p className="mr-2 text-xs text-zinc-400">Preview</p>
            {PAGES.map((p) => (
              <button key={p.file} onClick={() => setTab(p.file)} aria-pressed={tab === p.file}
                className={tab === p.file ? "rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-100" : "rounded-lg px-2.5 py-1 text-xs text-zinc-500 hover:bg-white/5"}>{p.label}</button>
            ))}
          </div>
          {pages ? <iframe key={tab + safeTheme.accent + safeTheme.baseSize + safeTheme.radius + safeTheme.headingFont + safeTheme.bodyFont} title={`Demo preview ${tab}`} srcDoc={pages[tab]} className="h-[560px] w-full bg-white" /> : <p className="p-8 text-center text-xs text-zinc-500">Generate content to preview all four pages.</p>}
        </div>
      </div>
    </div>
  );
}
