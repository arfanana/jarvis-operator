import { NextResponse } from "next/server";
import { safeFetch } from "@/lib/server/ssrf";
import { enforceLimit } from "@/lib/server/rate-limit";
import { requireOperator } from "@/lib/server/auth";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";

interface Score { score: number; label: string; basis: "Measured" | "Detected" | "Inferred" | "Needs verification"; detail: string; }

function auditHtml(html: string, headers: Record<string, string>, status: number, finalUrl: string) {
  const lower = html.toLowerCase();
  const title = html.match(/<title[^>]*>([^<]{1,160})<\/title>/i)?.[1]?.trim() ?? "";
  const meta = /<meta[^>]+name=["']description["'][^>]*>/i.test(html);
  const viewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  const h2 = (html.match(/<h2\b/gi) ?? []).length;
  const imgs = (html.match(/<img\b/gi) ?? []).length;
  const altImgs = (html.match(/<img[^>]+alt=["'][^"']+["']/gi) ?? []).length;
  const https = finalUrl.startsWith("https://");
  const cta = /(book|call|whatsapp|order|appointment|contact|quote)/i.test(html);
  const phone = /(\+?\d[\d\s\-()]{7,}\d)/.test(html);
  const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(html);
  const address = /(street|road|avenue|nagar|colony|sector|plot|shop)/i.test(html);
  const sizeKb = Math.round(Buffer.byteLength(html, "utf8") / 1024);

  const perf: Score = { score: sizeKb < 150 ? 85 : sizeKb < 400 ? 65 : 40, label: "Performance", basis: "Measured", detail: `HTTP ${status} · ~${sizeKb}KB HTML · ${https ? "HTTPS" : "no HTTPS"}` };
  const seo: Score = { score: (title ? 25 : 0) + (meta ? 25 : 0) + (h1 === 1 ? 20 : h1 > 1 ? 12 : 5) + (status === 200 ? 15 : 0), label: "SEO", basis: "Measured", detail: title ? `Title: "${title.slice(0, 80)}" · meta ${meta ? "present" : "missing"} · h1×${h1} h2×${h2}` : "No <title> detected" };
  const mobile: Score = { score: viewport ? 80 : 35, label: "Mobile", basis: "Detected", detail: viewport ? "Viewport meta present" : "No viewport meta — likely poor on phones" };
  const a11y: Score = { score: imgs === 0 ? 70 : Math.round((altImgs / imgs) * 80) + 10, label: "Accessibility", basis: "Measured", detail: `${altImgs}/${imgs} images have alt text` };
  const conv: Score = { score: (cta ? 45 : 10) + (phone ? 20 : 0) + (email ? 10 : 0) + (address ? 10 : 0), label: "Conversion", basis: "Detected", detail: [cta ? "CTA found" : "No clear CTA", phone ? "phone found" : "no phone", email ? "email found" : "no email"].join(" · ") };
  const overall = Math.round((perf.score + seo.score + mobile.score + a11y.score + conv.score) / 5);
  return { title, meta, viewport, h1, h2, imgs, altImgs, https, cta, phone, email, address, sizeKb, scores: { performance: perf, seo, mobile, accessibility: a11y, conversion: conv, overall } };
}

export async function POST(req: Request) {
  try {
    const op = await requireOperator(req);
    enforceLimit("audit", req);
    const body = (await req.json().catch(() => ({}))) as { url?: string; leadId?: string };
    capPayload(body, 5_000);
    if (!body.url || typeof body.url !== "string") throw err("validation", "url is required.");
    if (body.url.length > 2048) throw err("validation", "URL too long.");
    try {
      const r = await safeFetch(body.url, { timeoutMs: 10000, maxRedirects: 3, maxBytes: 750_000 });
      const audit = auditHtml(r.body.slice(0, 500_000), r.headers, r.status, r.finalUrl);
      const out = { ...audit, httpStatus: r.status, finalUrl: r.finalUrl, auditedAt: new Date().toISOString() };
      // Persist audit record when DB is available.
      try {
        const { dbEnabled } = await import("@/lib/server/db");
        if (dbEnabled()) {
          const { resolveWorkspace } = await import("@/lib/server/workspaces");
          const { insertRow, appendEvent } = await import("@/lib/server/repos");
          const ws = await resolveWorkspace(req, op);
          await insertRow(op, "website_audits", ws, { lead_id: body.leadId ?? null, url: body.url, final_url: r.finalUrl, http_status: r.status, scores: out.scores }).catch(() => {});
          if (body.leadId) await appendEvent(op, ws, body.leadId, "audit_generated", `Website audit: overall ${out.scores.overall}/100.`).catch(() => {});
        }
      } catch { /* record-keeping must not fail the audit */ }
      return NextResponse.json(out);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Audit failed." }, { status: 200 });
    }
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
