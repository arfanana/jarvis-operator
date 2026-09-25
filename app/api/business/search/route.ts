import { NextResponse } from "next/server";
import { activeSearchProvider, demoFallbackAllowed, DemoBusinessProvider, type BusinessSearchQuery } from "@/lib/server/business-search";
import { requireOperator } from "@/lib/server/auth";
import { enforceLimit } from "@/lib/server/rate-limit";
import { capPayload, err, requireString, toErrorResponse } from "@/lib/server/errors";

export async function POST(req: Request) {
  try {
    await requireOperator(req);
    enforceLimit("search", req);
    const body = (await req.json().catch(() => ({}))) as Partial<BusinessSearchQuery>;
    capPayload(body, 5_000);
    const text = requireString(body.text, "text", 120);
    const location = typeof body.location === "string" ? body.location.slice(0, 120) : undefined;
    const radiusKm = body.radiusKm !== undefined ? Number(body.radiusKm) : undefined;
    if (radiusKm !== undefined && (!Number.isFinite(radiusKm) || radiusKm < 0.5 || radiusKm > 100)) {
      throw err("validation", "radiusKm must be between 0.5 and 100.");
    }
    const { provider, source } = activeSearchProvider();
    const query = { text, location, radiusKm, minRating: body.minRating, minReviews: body.minReviews };
    try {
      const results = await provider.search(query);
      return NextResponse.json({ source, provider: provider.name, results });
    } catch (e) {
      // Live provider failed: demo fallback ONLY when explicitly enabled — never silent.
      if (provider.name !== "demo" && demoFallbackAllowed()) {
        const results = await new DemoBusinessProvider().search(query);
        return NextResponse.json({ source: "demo" as const, provider: "demo", results, notice: "Live search failed — showing labeled demo results." });
      }
      const r = toErrorResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
