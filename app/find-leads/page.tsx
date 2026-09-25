"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addLeads, buildLead, saveLeadsToServer, useLeads } from "@/lib/crm";
import { cn } from "@/lib/utils";
import { logEvent } from "@/lib/activity";
import { opportunityScoreFor } from "@/lib/lead-utils";
import { apiErrorMessage } from "@/lib/data-mode";
import { apiFetch } from "@/lib/supabase";
import type { Lead } from "@/lib/types";
import { Check, Plus, Search } from "lucide-react";

const CITIES: Record<string, string[]> = {
  Hyderabad: ["Secunderabad", "Kondapur", "Kukatpally", "Dilsukhnagar", "Gachibowli", "Begumpet"],
  Chennai: ["T. Nagar", "Anna Nagar", "Adyar"],
  Bengaluru: ["Indiranagar", "Koramangala", "Whitefield"],
  Pune: ["Kothrud", "Baner", "Hinjewadi"],
};
const RADII = ["5 km", "10 km", "25 km"];

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

interface SavedSearch { id: string; label: string; city: string; area: string; businessType: string; radius: string; }

interface BusinessResult {
  placeId?: string; name: string; category?: string; address?: string; city?: string;
  phone?: string; website?: string; rating?: number; reviewCount?: number; lat?: number; lng?: number;
  distanceKm?: number;
}

/** Map a server business result to a client Lead. Server is the source; ids are content-hashed. */
function businessToLead(b: BusinessResult, businessType: string, area: string, city: string): Lead {
  const category = b.category ?? businessType.replace(/\b\w/g, (c) => c.toUpperCase());
  let h = 0;
  const s = `${b.placeId ?? b.name}|${area}|${city}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const score = 40 + (Math.abs(h) % 35);
  return buildLead({
    name: b.name,
    category,
    city: b.city ?? area,
    region: city,
    phone: b.phone,
    website: b.website,
    website_status: b.website ? "unknown" : "no_website",
    place_id: b.placeId,
    score,
    rating: b.rating,
    reviewCount: b.reviewCount,
    source: "places",
  });
}

export default function FindLeadsPage() {
  return (
    <Suspense fallback={<p className="text-xs text-zinc-500">Loading…</p>}>
      <FindLeadsInner />
    </Suspense>
  );
}

function FindLeadsInner() {
  const params = useSearchParams();
  const [city, setCity] = useState("Hyderabad");
  const [area, setArea] = useState(params.get("area") ?? "Secunderabad");
  const [businessType, setBusinessType] = useState(params.get("q") ?? "dentist");
  const [radius, setRadius] = useState("10 km");
  const [sort, setSort] = useState<"opportunity" | "score" | "name">("opportunity");
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [siteFilter, setSiteFilter] = useState<"any" | "with" | "without">("any");
  const [minScore, setMinScore] = useState(0);
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [emailOnly, setEmailOnly] = useState(false);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState<{ at: string; q: string; results: Lead[]; source: "live" | "demo" | "local"; notice?: string; dist: Record<string, number> } | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<{ steps: { step: string; detail: string }[]; draft?: { lead: string; subject: string; body: string; note: string } | null; tasks?: { lead: string; title: string; due_in_days: number }[]; source?: string } | null>(null);
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<{ q: string; at: string; n: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem("jarvis-search-history") ?? "[]"); } catch { return []; }
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    try { return JSON.parse(localStorage.getItem("jarvis-saved-searches") ?? "[]"); } catch { return []; }
  });
  const reqId = useRef(0);

  const saved = useLeads();
  const savedIds = useMemo(() => new Set(saved.map((l) => l.id)), [saved]);

  const results = useMemo(() => {
    if (!search) return [];
    let r = [...search.results];
    r = r.filter((l) => (l.rating ?? 0) >= minRating && (l.reviewCount ?? 0) >= minReviews && opportunityScoreFor(l).score >= minScore);
    if (siteFilter === "with") r = r.filter((l) => !!l.website);
    if (siteFilter === "without") r = r.filter((l) => !l.website);
    if (phoneOnly) r = r.filter((l) => !!l.phone);
    if (emailOnly) r = r.filter((l) => !!l.email);
    if (sort === "opportunity") r.sort((a, b) => opportunityScoreFor(b).score - opportunityScoreFor(a).score);
    if (sort === "score") r.sort((a, b) => b.score - a.score);
    if (sort === "name") r.sort((a, b) => a.name.localeCompare(b.name));
    // dedupe within result set by normalized name
    const seen = new Set<string>();
    r = r.filter((l) => {
      const k = l.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return r;
  }, [search, sort, minRating, minReviews, siteFilter, minScore, phoneOnly, emailOnly]);

  const PAGE_SIZE = 20;
  const pageItems = results.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const unsaved = results.filter((r) => !savedIds.has(r.id));

  useEffect(() => { setPage(0); setSelected([]); }, [search, minRating, minReviews, siteFilter, minScore, phoneOnly, emailOnly, sort]);

  const run = async () => {
    const id = ++reqId.current;
    setSearching(true);
    setSearchErr(null);
    try {
      const radiusKm = parseInt(radius, 10) || 10;
      const r = await apiFetch("/api/business/search", {
        method: "POST",
        body: JSON.stringify({ text: businessType, location: `${area}, ${city}`, radiusKm, minRating: minRating || undefined, minReviews: minReviews || undefined }),
      });
      const j = await r.json();
      if (id !== reqId.current) return; // stale request guard
      if (!r.ok) throw new Error(apiErrorMessage(j, "Search failed."));
      const serverResults = ((j.results ?? []) as BusinessResult[]);
      const res: Lead[] = serverResults.map((b) => businessToLead(b, businessType, area, city));
      const dist: Record<string, number> = {};
      for (const b of serverResults) {
        if (typeof b.distanceKm === "number") dist[b.name] = b.distanceKm;
      }
      const source = j.source === "live" ? "live" : "demo";
      setSearch({
        at: new Date().toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        q: `${businessType} in ${area}, ${city} (${radius})`,
        results: res,
        source,
        notice: typeof j.notice === "string" ? j.notice : undefined,
        dist,
      });
      setHistory((h) => {
        const nh = [{ q: `${businessType} in ${area}, ${city}`, at: new Date().toISOString(), n: res.length }, ...h].slice(0, 10);
        try { localStorage.setItem("jarvis-search-history", JSON.stringify(nh)); } catch { /* noop */ }
        return nh;
      });
    } catch (e) {
      if (id === reqId.current) setSearchErr(e instanceof Error ? e.message : "Search failed.");
    } finally {
      if (id === reqId.current) setSearching(false);
    }
  };

  const runPipeline = async () => {
    setPipelineBusy(true);
    setPipeline(null);
    try {
      const r = await apiFetch("/api/intelligence/run", {
        method: "POST",
        body: JSON.stringify({
          query: businessType,
          location: `${area}, ${city}`,
          noWebsiteOnly: siteFilter === "without",
          existing: saved.map((l) => ({ name: l.name, phone: l.phone, website: l.website, placeId: l.place_id })),
          audit: true,
          outreach: true,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(apiErrorMessage(j, "Pipeline failed."));
      setPipeline({ steps: j.steps ?? [], draft: j.draft ?? null, tasks: j.tasks ?? [], source: j.source });
      (j.leads ?? []).forEach((l: { name: string }) => logEvent(null, "lead_enriched", `Pipeline enriched: ${l.name}`));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Pipeline failed.");
      window.setTimeout(() => setMsg(null), 3000);
    } finally {
      setPipelineBusy(false);
    }
  };

  const saveSearch = () => {
    const s: SavedSearch = { id: `s${Date.now()}`, label: `${businessType} · ${area}, ${city}`, city, area, businessType, radius };
    const ns = [s, ...savedSearches].slice(0, 10);
    setSavedSearches(ns);
    try { localStorage.setItem("jarvis-saved-searches", JSON.stringify(ns)); } catch { /* noop */ }
  };

  const bulkSave = async (ids: string[]) => {
    const rows = results.filter((r) => ids.includes(r.id) && !savedIds.has(r.id));
    if (!rows.length) return;
    const res = addLeads(rows, { sync: false });
    res.added.forEach((l) => logEvent(l.id, "lead_created", `Saved from Find Leads: ${l.name}`));
    setSelected([]);
    // Explicit server save — the user must see the real outcome, never a silent loss.
    const srv = await saveLeadsToServer(res.added);
    if (srv.ok) {
      setMsg(`Saved ${srv.created} to Supabase${srv.skipped ? `, ${srv.skipped} duplicates skipped` : ""}${res.skipped.length ? ` (${res.skipped.length} already saved)` : ""}.`);
    } else {
      setMsg(`Saved ${res.added.length} locally, BUT the server rejected them: ${srv.error} — they will NOT survive refresh.`);
    }
    window.setTimeout(() => setMsg(null), 5000);
  };

  const inp = "rounded-lg border border-[#1c1c21] bg-[#121215] px-3 py-2 text-[13px] text-zinc-100 outline-none focus:border-blue-500/50";
  // Map keyed by current query so markers (iframe) always reset to the current result set only.
  const mapKey = search ? `${search.q}` : "empty";
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(`${area}, ${city}`)}&z=13&h=520&output=embed`;

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">Lead discovery</p>
      <div className="mt-1 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Find leads</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500">Filter, page, select and bulk-save. Map always shows the current search only.</p>
        </div>
        <label title="Sort search results" className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-[#1c1c21] bg-[#0c0c0f] px-3 py-1.5 text-[12px] text-zinc-400">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-transparent font-medium text-zinc-100 outline-none [&>option]:bg-[#121215]">
            <option value="opportunity">Opportunity</option>
            <option value="score">Score</option>
            <option value="name">Business name</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_0.8fr]">
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">City
                <select value={city} onChange={(e) => { setCity(e.target.value); setArea(CITIES[e.target.value][0]); }} className={`${inp} mt-1.5 w-full`}>
                  {Object.keys(CITIES).map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Area
                <select value={area} onChange={(e) => setArea(e.target.value)} className={`${inp} mt-1.5 w-full`}>
                  {CITIES[city].map((a) => <option key={a}>{a}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Business type
                <input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="dentist" className={`${inp} mt-1.5 w-full`} />
              </label>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Radius
                <select value={radius} onChange={(e) => setRadius(e.target.value)} className={`${inp} mt-1.5 w-full`}>
                  {RADII.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3 grid gap-3 text-[11px] text-zinc-500 sm:grid-cols-3">
              <label>Min rating <input type="number" min={0} max={5} step={0.1} value={minRating} onChange={(e) => setMinRating(+e.target.value)} className={`${inp} mt-1 w-full`} /></label>
              <label>Min reviews <input type="number" min={0} value={minReviews} onChange={(e) => setMinReviews(+e.target.value)} className={`${inp} mt-1 w-full`} /></label>
              <label>Min opportunity <input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(+e.target.value)} className={`${inp} mt-1 w-full`} /></label>
              <label>Website <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value as typeof siteFilter)} className={`${inp} mt-1 w-full`}><option value="any">Any</option><option value="with">With website</option><option value="without">No website</option></select></label>
              <label className="flex items-end gap-2 pb-2"><input type="checkbox" checked={phoneOnly} onChange={(e) => setPhoneOnly(e.target.checked)} /> Phone available</label>
              <label className="flex items-end gap-2 pb-2"><input type="checkbox" checked={emailOnly} onChange={(e) => setEmailOnly(e.target.checked)} /> Email available</label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={run} disabled={searching}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                <Search size={15} /> {searching ? "Searching…" : "Search area"}
              </button>
              <button onClick={runPipeline} disabled={pipelineBusy || searching}
                title="Search → dedupe → score → website check → audit → outreach draft → tasks. Drafts only, nothing is sent."
                className="rounded-lg border border-emerald-600 px-3 py-2 text-[12px] font-semibold text-emerald-300 disabled:opacity-50">
                {pipelineBusy ? "Running pipeline…" : "Run intelligence pipeline"}
              </button>
              <button onClick={saveSearch} className="rounded-lg border border-[#27272A] px-3 py-2 text-[12px] text-zinc-300">Save search</button>
            </div>
            {searchErr && <p role="alert" className="mt-2 rounded-lg border border-rose-800 bg-rose-950 p-2 text-xs text-rose-200">{searchErr}</p>}
            {pipeline && (
              <div className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-xs" role="status">
                <p className="font-semibold text-emerald-200">Pipeline report {pipeline.source ? `(${pipeline.source === "live" ? "LIVE DATA" : "DEMO DATA"})` : ""}</p>
                <ul className="mt-1 space-y-0.5 text-emerald-100/80">
                  {pipeline.steps.map((s, i) => <li key={i}>• {s.step}: {s.detail}</li>)}
                </ul>
                {pipeline.draft && (
                  <div className="mt-2 rounded-lg border border-emerald-800 bg-black/30 p-2">
                    <p className="font-semibold text-emerald-200">Outreach draft for {pipeline.draft.lead} (NOT sent — review in Outreach)</p>
                    <p className="mt-1 text-zinc-300">{pipeline.draft.subject}</p>
                    <pre className="mt-1 whitespace-pre-wrap text-zinc-400">{pipeline.draft.body}</pre>
                  </div>
                )}
                {pipeline.tasks && pipeline.tasks.length > 0 && (
                  <p className="mt-2 text-emerald-100/80">Suggested tasks: {pipeline.tasks.map((t) => `${t.title} (day ${t.due_in_days})`).join(" · ")}</p>
                )}
              </div>
            )}
            {(history.length > 0 || savedSearches.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {savedSearches.map((s) => (
                  <button key={s.id} onClick={() => { setCity(s.city); setArea(s.area); setBusinessType(s.businessType); setRadius(s.radius); }} className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-blue-300">★ {s.label}</button>
                ))}
                {history.slice(0, 4).map((h, i) => <span key={i} className="rounded-full border border-[#27272A] px-2 py-0.5 text-zinc-500">{h.q} · {h.n}</span>)}
              </div>
            )}
          </section>

          <section className="relative overflow-hidden rounded-xl border border-[#1c1c21] bg-[#0c0c0f]">
            <iframe key={mapKey} src={mapSrc} title="Search area map" className="h-[420px] w-full border-0 lg:h-[520px]" loading="lazy" />
            <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-zinc-700 shadow">
              <span className={cn("h-1.5 w-1.5 rounded-full", search?.source === "live" ? "bg-emerald-500" : "bg-amber-500")} />{search?.source === "live" ? "Business search · live" : "Business search · demo"}
            </div>
            {searching && (
              <div className="absolute inset-0 grid place-items-center bg-black/50">
                <p className="flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#121215] px-4 py-2 text-[13px] text-zinc-200">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-400" />
                  Searching {area}, {city}…
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#1c1c21] bg-[#0c0c0f]">
          <header className="px-4 pb-3 pt-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-100">
                  {search ? `${results.length} businesses found` : "No search yet"}
                  {search && (
                    <span title={search.source === "live" ? "Real results from the configured business search provider" : "Simulated results — configure PLACES_API_KEY for live data"}
                      className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
                        search.source === "live" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-amber-500/40 bg-amber-500/15 text-amber-300")}>
                      {search.source === "live" ? "LIVE DATA" : "DEMO DATA"}
                    </span>
                  )}
                </h2>
                {search && (
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">Searched {search.at} · {search.q}</p>
                )}
                {search?.notice && (
                  <p role="status" className="mt-1 rounded-lg border border-amber-800 bg-amber-950 px-2 py-1 text-[11px] text-amber-200">{search.notice}</p>
                )}
              </div>
              {unsaved.length > 0 && (
                <button onClick={() => bulkSave(unsaved.map((r) => r.id))} title={`Save all ${unsaved.length} unsaved businesses to the CRM`}
                  className="flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-blue-400 hover:text-blue-300">
                  Add all<span className="text-zinc-600">›</span>
                </button>
              )}
            </div>
            {msg && <p role="status" className="mt-2 rounded-lg border border-emerald-800 bg-emerald-950 px-2 py-1 text-[11px] text-emerald-200">{msg}</p>}
            {selected.length > 0 && (
              <div className="mt-2 flex gap-1.5 text-[11px]">
                <button onClick={() => bulkSave(selected)} className="rounded-lg bg-blue-600 px-2 py-1 font-semibold text-white">Save {selected.length} selected</button>
                <button onClick={() => setSelected([])} className="rounded-lg border border-[#27272A] px-2 py-1 text-zinc-400">Clear</button>
              </div>
            )}
          </header>
          <div className="max-h-[560px] overflow-y-auto border-t border-[#1c1c21]">
            {!search && (
              <p className="px-4 py-10 text-center text-[12px] text-zinc-500">Pick a city and area, then hit <span className="text-zinc-300">Search area</span> to scan Google Places.</p>
            )}
            {search && results.length === 0 && (
              <p className="px-4 py-10 text-center text-[12px] text-zinc-500">No businesses found — try a wider radius or looser filters.</p>
            )}
            {search && results.length > 0 && (
              <label className="flex items-center gap-2 border-b border-[#141417] px-4 py-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={pageItems.every((r) => selected.includes(r.id) || savedIds.has(r.id))} onChange={(e) => {
                  if (e.target.checked) setSelected((s) => Array.from(new Set([...s, ...pageItems.filter((r) => !savedIds.has(r.id)).map((r) => r.id)])));
                  else setSelected((s) => s.filter((id) => !pageItems.some((r) => r.id === id)));
                }} /> Select page ({pageItems.length})
              </label>
            )}
            {pageItems.map((r) => {
              const isSaved = savedIds.has(r.id);
              const isSel = selected.includes(r.id);
              return (
                <div key={r.id} className="group flex items-center gap-3 border-b border-[#141417] px-4 py-3 hover:bg-white/[0.03]">
                  {!isSaved && <input type="checkbox" aria-label={`Select ${r.name}`} checked={isSel} onChange={() => setSelected((s) => s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id])} />}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#27272A] bg-[#121215] text-[10px] font-bold text-zinc-400">
                    {initials(r.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-100">{r.name}</p>
                    <p className="truncate text-[11px] text-zinc-500">{r.city}, {r.region} · {r.rating?.toFixed(1)}★ ({r.reviewCount}){r.phone ? " · ☎" : ""}{r.email ? " · ✉" : ""}{r.website ? "" : " · no site"}{search?.dist[r.name] !== undefined ? ` · ${search.dist[r.name]} km away` : ""}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      opp {opportunityScoreFor(r).score} · score {r.score}
                    </p>
                  </div>
                  <button
                    onClick={() => !isSaved && bulkSave([r.id])}
                    disabled={isSaved}
                    title={isSaved ? "Saved to CRM" : `Save ${r.name} to CRM`}
                    className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors",
                      isSaved
                        ? "text-emerald-500"
                        : "border border-[#27272A] text-zinc-500 opacity-0 group-hover:opacity-100 hover:border-blue-500/50 hover:text-blue-400")}>
                    {isSaved ? <Check size={15} /> : <Plus size={15} />}
                  </button>
                </div>
              );
            })}
          </div>
          {results.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-[#1c1c21] px-4 py-2 text-[11px] text-zinc-400">
              <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded border border-[#27272A] px-2 py-1 disabled:opacity-40">← Prev</button>
              <span>Page {page + 1} / {pages}</span>
              <button disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="rounded border border-[#27272A] px-2 py-1 disabled:opacity-40">Next →</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
