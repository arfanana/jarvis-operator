"use client";
import { useMemo, useState } from "react";
import { addLeads, buildLead, saveLeadsToServer, useLeads } from "@/lib/crm";
import { detectDuplicates, normalizeDomain, normalizePhone, parseMapsDetails, parsePasteLinks } from "@/lib/lead-utils";
import { logEvent } from "@/lib/activity";

interface Draft { name: string; category: string; city: string; region: string; email: string; phone: string; website: string; score: number; }
const EMPTY: Draft = { name: "", category: "", city: "", region: "", email: "", phone: "", website: "", score: 50 };

export default function AddLeadsPage() {
  const existing = useLeads();
  const [f, setF] = useState<Draft>(EMPTY);
  const [errs, setErrs] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<Draft[]>([]);
  const [linksText, setLinksText] = useState("");
  const [mapsText, setMapsText] = useState("");
  const set = (k: keyof Draft, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 4000); };

  const linksPreview = useMemo(() => parsePasteLinks(linksText), [linksText]);
  const mapsPreview = useMemo(() => parseMapsDetails(mapsText), [mapsText]);

  const submit = async () => {
    const e: string[] = [];
    if (f.name.trim().length < 2) e.push("Name required.");
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.push("Email invalid.");
    if (f.score < 0 || f.score > 100) e.push("Score must be 0–100.");
    setErrs(e);
    if (e.length) return;
    const lead = buildLead({ ...f, phone: normalizePhone(f.phone) || f.phone, website: f.website.trim() || undefined });
    const res = addLeads([lead], { sync: false });
    if (res.added.length) {
      logEvent(lead.id, "lead_created", `Lead created: ${lead.name}`);
      setF(EMPTY);
      const srv = await saveLeadsToServer(res.added);
      flash(srv.ok ? "Lead saved to Supabase — visible in Saved leads, Pipeline, and Today." : `Saved locally, BUT server rejected it: ${srv.error} — it will NOT survive refresh.`);
    } else {
      flash(`Duplicate detected — matched on ${res.skipped[0]?.reasons.join(", ")}. Not imported.`);
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    const [head, ...lines] = text.trim().split(/\r?\n/);
    const keys = head.split(",").map((h) => h.trim().toLowerCase());
    const rows: Draft[] = lines.filter(Boolean).map((ln) => {
      const cells = ln.split(",").map((c) => c.trim());
      const o: Record<string, string> = {};
      keys.forEach((k, i) => (o[k] = cells[i] ?? ""));
      return { name: o.name ?? "", category: o.category ?? "", city: o.city ?? "", region: o.region ?? "", email: o.email ?? "", phone: o.phone ?? "", website: o.website ?? "", score: +(o.score ?? 50) || 50 };
    });
    setCsvRows(rows);
  };

  const importLinks = async () => {
    const leads = linksPreview.map((p) =>
      buildLead({ name: normalizeDomain(p.domain).split(".")[0].replace(/[-_]/g, " ") || p.domain, website: p.url, source: "paste-links" })
    );
    const res = addLeads(leads, { sync: false });
    res.added.forEach((l) => logEvent(l.id, "lead_created", `Lead imported from pasted link: ${l.website}`));
    const srv = await saveLeadsToServer(res.added);
    flash(srv.ok ? `Imported ${srv.created} links to Supabase${srv.skipped ? `, ${srv.skipped} duplicates skipped` : ""}.` : `Imported locally, BUT server rejected: ${srv.error}.`);
    setLinksText("");
  };

  const importMaps = async () => {
    const leads = mapsPreview.map((m) =>
      buildLead({ name: m.name, category: m.category, phone: m.phone, website: m.website, rating: m.rating, reviewCount: m.reviewCount, place_id: m.placeId, source: "maps-paste" })
    );
    const res = addLeads(leads, { sync: false });
    res.added.forEach((l) => logEvent(l.id, "lead_created", `Lead imported from Maps paste: ${l.name}`));
    const srv = await saveLeadsToServer(res.added);
    flash(srv.ok ? `Imported ${srv.created} businesses to Supabase${srv.skipped ? `, ${srv.skipped} duplicates skipped` : ""}.` : `Imported locally, BUT server rejected: ${srv.error}.`);
    setMapsText("");
  };

  const inp = "rounded border border-border bg-base px-2 py-1.5 text-xs w-full";
  return (
    <div className="space-y-3">
      <h1 className="text-base font-bold">Add Leads</h1>
      {msg && <p role="status" className="rounded border border-emerald-700 bg-emerald-950 p-2 text-xs">{msg}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel p-3">
          <h2 className="text-xs font-semibold">Manual entry</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["name", "category", "city", "region", "email", "phone", "website"] as const).map((k) => (
              <label key={k} className="text-2xs uppercase tracking-wide text-muted">{k}<input aria-label={k} className={inp} value={f[k]} onChange={(e) => set(k, e.target.value)} /></label>
            ))}
            <label className="text-2xs uppercase tracking-wide text-muted">score ({f.score})<input aria-label="score" type="range" min={0} max={100} className="w-full" value={f.score} onChange={(e) => set("score", +e.target.value)} /></label>
          </div>
          {(() => {
            const dups = f.name || f.phone || f.website ? detectDuplicates({ name: f.name, phone: f.phone, website: f.website }, existing) : [];
            return dups.length > 0 ? <p className="mt-2 rounded border border-amber-800 bg-amber-950 p-2 text-xs text-amber-200">Possible duplicate of “{dups[0].lead.name}” (matched: {dups[0].reasons.join(", ")}).</p> : null;
          })()}
          {errs.length > 0 && <ul className="mt-2 rounded border border-red-800 bg-red-950 p-2 text-xs">{errs.map((e) => <li key={e}>• {e}</li>)}</ul>}
          <button onClick={submit} className="mt-2 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Save lead</button>
        </div>
        <div className="rounded border border-border bg-panel p-3">
          <h2 className="text-xs font-semibold">CSV importer</h2>
          <p className="mt-1 text-2xs text-muted">Header: name,category,city,region,email,phone,website,score</p>
          <input type="file" accept=".csv" aria-label="CSV file" className="mt-2 text-xs" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) onFile(fl); }} />
          {csvRows.length > 0 && (
            <>
              <div className="mt-2 max-h-48 overflow-auto rounded border border-border">
                <table className="dense-table w-full"><thead><tr><th>Name</th><th>City</th><th>Score</th></tr></thead>
                  <tbody>{csvRows.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.city}</td><td>{r.score}</td></tr>)}</tbody></table>
              </div>
              <button onClick={async () => { const res = addLeads(csvRows.map((r) => buildLead(r)), { sync: false }); res.added.forEach((l) => logEvent(l.id, "lead_created", `CSV import: ${l.name}`)); const srv = await saveLeadsToServer(res.added); flash(srv.ok ? `Imported ${srv.created} leads to Supabase.` : `Imported locally, BUT server rejected: ${srv.error}.`); setCsvRows([]); }} className="mt-2 rounded bg-sky-700 px-3 py-1.5 text-xs font-medium">Import {csvRows.length} leads</button>
            </>
          )}
        </div>
        <div className="rounded border border-border bg-panel p-3">
          <h2 className="text-xs font-semibold">Paste links — import multiple URLs</h2>
          <p className="mt-1 text-2xs text-muted">Paste one or many URLs (lines, commas or inline). Preview below, duplicates flagged.</p>
          <textarea value={linksText} onChange={(e) => setLinksText(e.target.value)} rows={4} placeholder={"https://example.com\nhttps://another.in/menu, www.third.com"} aria-label="Paste links" className="mt-2 w-full rounded border border-border bg-base p-2 text-xs" />
          {linksPreview.length > 0 && (
            <>
              <ul className="mt-2 max-h-36 space-y-1 overflow-auto text-xs">
                {linksPreview.map((p, i) => {
                  const dup = detectDuplicates({ website: p.url }, existing);
                  return <li key={i} className="flex justify-between gap-2 rounded border border-border bg-base px-2 py-1"><span className="truncate">{p.domain}</span><span className={dup.length ? "text-amber-400" : "text-emerald-400"}>{dup.length ? `duplicate (${dup[0].reasons.join(",")})` : "new"}</span></li>;
                })}
              </ul>
              <button onClick={importLinks} className="mt-2 rounded bg-sky-700 px-3 py-1.5 text-xs font-medium">Import {linksPreview.length} URLs</button>
            </>
          )}
        </div>
        <div className="rounded border border-border bg-panel p-3">
          <h2 className="text-xs font-semibold">Paste Maps details — parse into leads</h2>
          <p className="mt-1 text-2xs text-muted">Paste Google Maps / business blocks (name, rating, address, phone, website). Blank-line separated.</p>
          <textarea value={mapsText} onChange={(e) => setMapsText(e.target.value)} rows={4} placeholder={"Sharma Dental Clinic\n4.3 (212) · Dental Clinic\nKukatpally, Hyderabad\nPhone: +91 98765 43210\nhttps://sharmadental.in"} aria-label="Paste Maps details" className="mt-2 w-full rounded border border-border bg-base p-2 text-xs" />
          {mapsPreview.length > 0 && (
            <>
              <ul className="mt-2 max-h-36 space-y-1 overflow-auto text-xs">
                {mapsPreview.map((m, i) => {
                  const dup = detectDuplicates({ name: m.name, phone: m.phone, website: m.website, placeId: m.placeId }, existing);
                  return <li key={i} className="flex justify-between gap-2 rounded border border-border bg-base px-2 py-1"><span className="truncate">{m.name}{m.rating ? ` · ${m.rating}★` : ""}{m.phone ? ` · ${m.phone}` : ""}</span><span className={dup.length ? "text-amber-400" : "text-emerald-400"}>{dup.length ? `duplicate (${dup[0].reasons.join(",")})` : "new"}</span></li>;
                })}
              </ul>
              <button onClick={importMaps} className="mt-2 rounded bg-sky-700 px-3 py-1.5 text-xs font-medium">Import {mapsPreview.length} businesses</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
