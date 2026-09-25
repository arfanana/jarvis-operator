import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/auth";
import { enforceLimit } from "@/lib/server/rate-limit";
import { capPayload, requireString, toErrorResponse } from "@/lib/server/errors";
import { activeSearchProvider } from "@/lib/server/business-search";
import { detectDuplicates, opportunityScoreFor } from "@/lib/lead-utils";
import { safeFetch } from "@/lib/server/ssrf";
import type { Lead } from "@/lib/types";

// POST /api/intelligence/run — one workflow:
// search → dedupe → score → website check → optional audit → optional outreach draft → follow-up tasks.
// Stateless: the client persists results (demo store or /api/leads).
// NEVER sends WhatsApp/email automatically — drafts only, user reviews before sending.
export async function POST(req: Request) {
  try {
    await requireOperator(req);
    enforceLimit("intelligence", req);
    const body = (await req.json().catch(() => ({}))) as {
      query?: string; location?: string; noWebsiteOnly?: boolean;
      existing?: { name?: string; phone?: string; website?: string; placeId?: string }[];
      audit?: boolean; outreach?: boolean;
    };
    capPayload(body, 60_000);
    const query = requireString(body.query, "query", 120);
    const steps: { step: string; detail: string }[] = [];

    // 1. Search (live or demo — always labeled).
    const { provider, source } = activeSearchProvider();
    let found;
    try {
      found = await provider.search({ text: query, location: body.location });
    } catch (e) {
      const r = toErrorResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    steps.push({ step: "search", detail: `${found.length} businesses via ${provider.name} (${source === "live" ? "LIVE DATA" : "DEMO DATA"})` });

    // 2. Dedupe against caller-provided existing leads.
    const existing = Array.isArray(body.existing) ? body.existing.slice(0, 2000) : [];
    const fresh = found.filter((b) =>
      detectDuplicates({ name: b.name, phone: b.phone, website: b.website, placeId: b.placeId }, existing as Lead[]).length === 0
    );
    steps.push({ step: "dedupe", detail: `${fresh.length} new after dedupe (${found.length - fresh.length} duplicates skipped)` });

    // 3. Website filter + status check (top 8, sequential, SSRF-safe).
    let scoped = fresh;
    if (body.noWebsiteOnly) scoped = scoped.filter((b) => !b.website);
    const leads = await Promise.all(
      scoped.slice(0, 8).map(async (b) => {
        const lead = {
          name: b.name, category: b.category ?? query, city: b.city ?? body.location ?? "",
          phone: b.phone, website: b.website, rating: b.rating, reviewCount: b.reviewCount, placeId: b.placeId,
        };
        const { score, breakdown } = opportunityScoreFor(lead as unknown as Lead);
        let website_status: string = b.website ? "unknown" : "no_website";
        if (b.website) {
          try {
            const r = await safeFetch(b.website, { timeoutMs: 6000, maxBytes: 200_000 });
            website_status = r.status >= 200 && r.status < 400 ? "functional" : "unreachable";
          } catch { website_status = "unreachable"; }
        }
        return { ...lead, opportunity_score: score, score_breakdown: breakdown, website_status };
      })
    );
    steps.push({ step: "score_website", detail: `${leads.length} scored + website-checked` });

    // 4. Optional audit of top lead with a reachable site (measured only).
    let audit: unknown = null;
    if (body.audit) {
      const target = leads.find((l) => l.website && l.website_status === "functional");
      if (target?.website) {
        try {
          const r = await fetch(new URL("/api/website/audit", req.url).toString(), {
            method: "POST", headers: { "Content-Type": "application/json", ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization") as string } : {}) },
            body: JSON.stringify({ url: target.website }),
          });
          audit = { lead: target.name, result: await r.json().catch(() => null) };
          steps.push({ step: "audit", detail: `Audited ${target.name}` });
        } catch { steps.push({ step: "audit", detail: "Audit failed — see lead data." }); }
      } else steps.push({ step: "audit", detail: "No reachable website to audit." });
    }

    // 5. Optional outreach DRAFT (never sent).
    let draft: unknown = null;
    if (body.outreach && leads.length) {
      const top = [...leads].sort((a, b) => b.opportunity_score - a.opportunity_score)[0];
      draft = {
        lead: top.name,
        channel: "email",
        subject: `${top.name} — 2 booking leaks I spotted`,
        body: `Hi ${top.name} team,\n\nI looked at ${top.name} (${top.category}, ${top.city}). [Known facts: ${top.rating ? `${top.rating}★, ${top.reviewCount ?? 0} reviews` : "no public rating found"}; website: ${top.website ?? "none"}.]\n[Assumptions — verify on a call: review volume suggests unmet booking demand.]\n\nI recorded a 90-second teardown specific to you. Want me to send it?\n\n— Jarvis Growth`,
        note: "DRAFT ONLY — review before sending. WhatsApp is never sent automatically.",
      };
      steps.push({ step: "outreach_draft", detail: `Draft prepared for ${top.name} (not sent)` });
    }

    // 6. Follow-up tasks for the client to create.
    const tasks = [...leads]
      .sort((a, b) => b.opportunity_score - a.opportunity_score)
      .slice(0, 5)
      .map((l) => ({ lead: l.name, title: `Follow up with ${l.name}`, due_in_days: l.opportunity_score >= 70 ? 1 : 3 }));
    steps.push({ step: "tasks", detail: `${tasks.length} follow-up tasks suggested` });

    return NextResponse.json({ source, provider: provider.name, steps, leads, audit, draft, tasks });
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
