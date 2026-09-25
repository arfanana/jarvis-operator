import type { Lead } from "@/lib/types";

/** Normalize phone to digits with leading + kept: strips spaces/dashes/parens. */
export function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  // Drop leading zeros for comparison, keep last 10-13 digits
  const d = digits.replace(/^0+/, "");
  return plus + d;
}

export function phoneKey(raw?: string | null): string {
  const n = normalizePhone(raw);
  if (!n) return "";
  // compare last 10 digits (India-friendly) plus full fallback
  const digits = n.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Normalize business name: lowercase, strip legal suffixes & punctuation. */
export function normalizeName(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/\b(pvt|ltd|llp|inc|llc|co|company|enterprises?|services?|solutions?|group|clinic|hospitals?|studio|centre|center)\b\.?/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract + normalize domain from URL or bare hostname. */
export function normalizeDomain(raw?: string | null): string {
  if (!raw) return "";
  let s = raw.trim().toLowerCase();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    let h = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    return h;
  } catch {
    return s.replace(/^www\./, "").split(/[\s/]/)[0] ?? "";
  }
}

export function normalizeUrl(raw?: string | null): string {
  if (!raw) return "";
  let s = raw.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    u.hash = "";
    // drop tracking params
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((k) =>
      u.searchParams.delete(k)
    );
    return u.toString().replace(/\/$/, "");
  } catch {
    return s;
  }
}

/** Parse pasted text containing multiple URLs (one per line, comma/space separated, or inline). */
export function parsePasteLinks(text: string): { url: string; domain: string }[] {
  if (!text) return [];
  const urlRe = /https?:\/\/[^\s,;"'<>()\]]+|www\.[^\s,;"'<>()\]]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s,;"'<>()\]]*)?/gi;
  const found = text.match(urlRe) ?? [];
  const seen = new Set<string>();
  const out: { url: string; domain: string }[] = [];
  for (const f of found) {
    const url = normalizeUrl(f);
    const domain = normalizeDomain(f);
    if (!domain || domain === "https://") continue;
    const key = domain + "|" + url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ url, domain });
  }
  return out;
}

export interface MapsParsedLead {
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  placeId?: string;
  raw: string;
}

/**
 * Parse pasted Google Maps / business info blocks into multiple leads.
 * Handles blocks separated by blank lines, each with lines like:
 *   Name
 *   4.5 (231) · Dental Clinic
 *   Address...
 *   Phone: +91 ...
 *   Website: https://...
 *   https://maps.google.com/?cid=... / ?place/... / place_id: ...
 */
export function parseMapsDetails(text: string): MapsParsedLead[] {
  if (!text?.trim()) return [];
  const blocks = text
    .split(/\n\s*\n|---+\s*\n|===+\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  // If no blank-line blocks, treat each non-empty line group of up to 6 lines
  const chunks: string[] =
    blocks.length >= 2 ? blocks : splitLinesToBlocks(text);
  const out: MapsParsedLead[] = [];
  for (const block of chunks) {
    const parsed = parseMapsBlock(block);
    if (parsed.name) out.push(parsed);
  }
  return out;
}

function splitLinesToBlocks(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 5) return [lines.join("\n")];
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 5) out.push(lines.slice(i, i + 5).join("\n"));
  return out;
}

function parseMapsBlock(block: string): MapsParsedLead {
  const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let name = "";
  let phone: string | undefined;
  let website: string | undefined;
  let address: string | undefined;
  let rating: number | undefined;
  let reviewCount: number | undefined;
  let category: string | undefined;
  let placeId: string | undefined;

  // name = first line that isn't clearly phone/url/rating
  for (const ln of lines) {
    if (!name && !/^(phone|tel|website|address|rating|reviews?)\s*:/i.test(ln) && !/^https?:\/\//i.test(ln) && !/^\+?[\d\s\-()]{7,}$/.test(ln) && !/^\d\.\d/.test(ln)) {
      name = ln.replace(/^name\s*:\s*/i, "").trim();
      break;
    }
  }
  if (!name) name = lines[0]?.slice(0, 120) ?? "";

  for (const ln of lines) {
    const phoneM = ln.match(/(?:phone|tel|mobile|contact)?\s*:?\s*(\+?[\d][\d\s\-()]{6,15}\d)/i);
    if (phoneM && !phone) phone = phoneM[1].trim();
    const urlM = ln.match(/https?:\/\/[^\s,;"'<>()\]]+/i) ?? ln.match(/www\.[^\s,;"'<>()\]]+/i);
    if (urlM && !website && !/maps\.google|google\.\w+\/maps/i.test(urlM[0])) website = normalizeUrl(urlM[0]);
    else if (urlM && /maps\.google|google\.\w+\/maps/i.test(urlM[0]) && !placeId) {
      const cid = urlM[0].match(/[?&](?:cid|place_id)=([^&\s]+)/i)?.[1];
      if (cid) placeId = cid;
    }
    const placeM = ln.match(/place[_\s-]?id\s*[:=]\s*([A-Za-z0-9_-]+)/i);
    if (placeM) placeId = placeM[1];
    const rateM = ln.match(/(\d\.\d)\s*[★*]?\s*\(?\s*([\d,]+)?\s*\)?/);
    if (rateM && rating === undefined) {
      const r = parseFloat(rateM[1]);
      if (r >= 0 && r <= 5) {
        rating = r;
        if (rateM[2]) reviewCount = parseInt(rateM[2].replace(/,/g, ""), 10);
      }
    }
    const catM = ln.match(/[·•|—-]\s*([A-Z][A-Za-z &/]{2,40})\s*(?:[·•|—-]|$)/);
    if (catM && !category) category = catM[1].trim();
    if (/^(address|location)\s*:/i.test(ln) && !address) address = ln.replace(/^(address|location)\s*:\s*/i, "");
  }
  // bare phone line
  if (!phone) {
    const bare = lines.find((l) => /^\+?[\d\s\-()]{8,}$/.test(l));
    if (bare) phone = bare;
  }
  return { name, phone, website, address, rating, reviewCount, category, placeId, raw: block };
}

export interface DuplicateMatch {
  lead: Lead;
  reasons: ("phone" | "name" | "domain" | "place_id")[];
}

/** Duplicate detection across phone, normalized name, normalized domain, Google place ID. */
export function detectDuplicates(candidate: {
  name?: string;
  phone?: string;
  website?: string;
  placeId?: string;
}, existing: Lead[]): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  const cPhone = phoneKey(candidate.phone);
  const cName = normalizeName(candidate.name);
  const cDomain = normalizeDomain(candidate.website);
  const cPlace = (candidate.placeId ?? "").trim().toLowerCase();
  for (const lead of existing) {
    const reasons: DuplicateMatch["reasons"] = [];
    const l = lead as unknown as Record<string, unknown>;
    if (cPhone && phoneKey(lead.phone) && phoneKey(lead.phone) === cPhone) reasons.push("phone");
    if (cName && normalizeName(lead.name) === cName) reasons.push("name");
    if (cDomain && normalizeDomain(lead.website) === cDomain) reasons.push("domain");
    const lPlace = String(l.place_id ?? l.placeId ?? "").toLowerCase();
    if (cPlace && lPlace && lPlace === cPlace) reasons.push("place_id");
    if (reasons.length) out.push({ lead, reasons });
  }
  return out;
}

// ---------- Opportunity Score (transparent, NOT calibrated probability) ----------

export interface OpportunityBreakdown {
  label: string;
  points: number;
  max: number;
  detail: string;
  confidence: "Measured" | "Detected" | "Inferred" | "Needs verification";
  signal: "positive" | "negative" | "missing";
}

export function opportunityScoreFor(lead: Lead): { score: number; breakdown: OpportunityBreakdown[] } {
  const bd: OpportunityBreakdown[] = [];
  // Search fit (category/city present)
  const fitPts = lead.category && lead.category !== "General" ? 12 : 6;
  bd.push({ label: "Search fit", points: fitPts, max: 15, detail: lead.category ? `${lead.category} in ${lead.city}` : "No category", confidence: "Detected", signal: fitPts >= 12 ? "positive" : "missing" });
  // Business signals (rating + reviews)
  const reviews = lead.reviewCount ?? 0;
  const bizPts = Math.min(20, Math.round(reviews / 10) + (lead.rating && lead.rating >= 4 ? 8 : lead.rating ? 5 : 2));
  bd.push({ label: "Business signals", points: bizPts, max: 20, detail: `${lead.rating?.toFixed(1) ?? "—"}★ · ${reviews} reviews`, confidence: reviews ? "Measured" : "Needs verification", signal: reviews >= 50 ? "positive" : reviews > 0 ? "negative" : "missing" });
  // Contactability
  let cPts = 0;
  if (lead.phone) cPts += 10;
  if (lead.email) cPts += 8;
  if (!lead.phone && !lead.email) cPts = 2;
  bd.push({ label: "Contactability", points: Math.min(18, cPts), max: 18, detail: [lead.phone ? "phone ✓" : "no phone", lead.email ? "email ✓" : "no email"].join(" · "), confidence: "Measured", signal: lead.phone && lead.email ? "positive" : !lead.phone && !lead.email ? "missing" : "negative" });
  // Website opportunity
  const ws = (lead as unknown as Record<string, unknown>).website_status as string | undefined;
  let wPts = 15;
  let wDetail = "No website — high-need prospect";
  if (lead.website && ws === "needs_improvement") { wPts = 14; wDetail = "Site present but needs improvement"; }
  else if (lead.website && ws === "functional") { wPts = 8; wDetail = "Functional site — pitch redesign/SEO"; }
  else if (lead.website) { wPts = 10; wDetail = "Has site — verify quality via audit"; }
  bd.push({ label: "Website opportunity", points: wPts, max: 17, detail: wDetail, confidence: lead.website ? "Detected" : "Inferred", signal: !lead.website || ws === "needs_improvement" ? "positive" : ws === "functional" ? "negative" : "missing" });
  // Review/reputation
  const repPts = lead.rating ? (lead.rating < 4.2 ? 15 : lead.rating < 4.6 ? 10 : 6) : 8;
  bd.push({ label: "Review/reputation", points: repPts, max: 15, detail: lead.rating ? `${lead.rating.toFixed(1)}★ gap analysis` : "No rating — greenfield", confidence: lead.rating ? "Measured" : "Needs verification", signal: lead.rating ? (lead.rating < 4.2 ? "positive" : "negative") : "missing" });
  // Location fit
  bd.push({ label: "Location fit", points: lead.city ? 10 : 5, max: 15, detail: `${lead.city}, ${lead.region}`, confidence: "Detected", signal: lead.city ? "positive" : "missing" });
  const score = Math.max(0, Math.min(100, bd.reduce((s, b) => s + b.points, 0)));
  return { score, breakdown: bd };
}

/** Explainable score: positives, negatives, missing data. Never a conversion probability. */
export function explainScore(lead: Lead): {
  score: number;
  positives: OpportunityBreakdown[];
  negatives: OpportunityBreakdown[];
  missing: OpportunityBreakdown[];
  breakdown: OpportunityBreakdown[];
} {
  const { score, breakdown } = opportunityScoreFor(lead);
  return {
    score,
    breakdown,
    positives: breakdown.filter((b) => b.signal === "positive"),
    negatives: breakdown.filter((b) => b.signal === "negative"),
    missing: breakdown.filter((b) => b.signal === "missing"),
  };
}

// ---------- CSV / JSON / PDF export (real) ----------

export function leadsToCSV(leads: Lead[]): string {
  if (!leads.length) return "";
  const keys = ["id", "name", "category", "city", "region", "status", "score", "opportunity_score", "phone", "email", "website", "website_status", "rating", "reviewCount", "deal_value", "next_follow_up", "created_at", "source"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map((l) => {
    const r = l as unknown as Record<string, unknown>;
    return keys.map((k) => {
      if (k === "opportunity_score") return esc(opportunityScoreFor(l).score);
      if (k === "next_follow_up") return esc(l.next_follow_up ?? l.nextFollowUp ?? "");
      return esc(r[k]);
    }).join(",");
  });
  return [keys.join(","), ...rows].join("\n");
}

export function leadsToJSON(leads: Lead[]): string {
  return JSON.stringify(leads.map((l) => ({ ...l, opportunity_score: opportunityScoreFor(l).score })), null, 2);
}

/** Minimal printable PDF: returns an HTML document string the UI prints via window.print / iframe. */
export function leadsToPrintableHTML(leads: Lead[], title = "Jarvis — Leads export"): string {
  const rows = leads.map((l) => {
    const { score } = opportunityScoreFor(l);
    return `<tr><td>${escapeHtml(l.name)}</td><td>${escapeHtml(l.category)}</td><td>${escapeHtml(l.city)}</td><td>${escapeHtml(l.status)}</td><td>${score}</td><td>${escapeHtml(l.phone ?? "")}</td><td>${escapeHtml(l.email ?? "")}</td><td>${escapeHtml(l.website ?? "")}</td></tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px;text-align:left}th{background:#eee}h1{font-size:18px}</style></head><body><h1>${escapeHtml(title)} — ${leads.length} leads (${new Date().toLocaleDateString()})</h1><table><thead><tr><th>Name</th><th>Category</th><th>City</th><th>Status</th><th>Opp.</th><th>Phone</th><th>Email</th><th>Website</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------- Invoice math ----------

export interface InvoiceLine { label: string; qty: number; rate: number; }
export interface InvoiceCalc {
  subtotal: number; discount: number; taxable: number; gstRate: number; gstAmount: number; total: number;
}

export function calcInvoice(lines: InvoiceLine[], opts?: { discount?: number; gstRate?: number; gstEnabled?: boolean }): InvoiceCalc {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const discount = Math.min(subtotal, Math.max(0, opts?.discount ?? 0));
  const taxable = subtotal - discount;
  const gstRate = opts?.gstEnabled ? Math.max(0, opts?.gstRate ?? 0) : 0;
  const gstAmount = Math.round(taxable * (gstRate / 100));
  const total = taxable + gstAmount;
  return { subtotal, discount, taxable, gstRate, gstAmount, total };
}

let invSeq = 0;
export function nextInvoiceNumber(prefix = "JARVIS"): string {
  invSeq += 1;
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${ymd}-${String(invSeq).padStart(4, "0")}`;
}

/** UPI payment link (no third-party). upi://pay?pa=...&pn=...&am=...&cu=INR */
export function upiLink(opts: { payeeVpa: string; payeeName?: string; amount?: number; note?: string }): string {
  const p = new URLSearchParams();
  p.set("pa", opts.payeeVpa);
  if (opts.payeeName) p.set("pn", opts.payeeName);
  if (opts.amount && opts.amount > 0) p.set("am", opts.amount.toFixed(2));
  p.set("cu", "INR");
  if (opts.note) p.set("tn", opts.note.slice(0, 80));
  return `upi://pay?${p.toString()}`;
}
