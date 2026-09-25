import { NextResponse } from "next/server";
import { safeFetch } from "@/lib/server/ssrf";
import { enforceLimit } from "@/lib/server/rate-limit";
import { requireOperator } from "@/lib/server/auth";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";

export type WebsiteStatus = "functional" | "unreachable" | "unknown" | "no_website" | "needs_improvement";

export async function POST(req: Request) {
  try {
    await requireOperator(req);
    enforceLimit("verify", req);
    const body = (await req.json().catch(() => ({}))) as { url?: string };
    capPayload(body, 5_000);
    if (!body.url || typeof body.url !== "string") throw err("validation", "url is required.");
    if (body.url.length > 2048) throw err("validation", "URL too long.");
    try {
      const r = await safeFetch(body.url, { timeoutMs: 8000, maxRedirects: 3, maxBytes: 750_000 });
      const status: WebsiteStatus = r.status >= 200 && r.status < 400 ? "functional" : "unreachable";
      return NextResponse.json({ status, httpStatus: r.status, finalUrl: r.finalUrl, size: r.size, checkedAt: new Date().toISOString() });
    } catch (e) {
      return NextResponse.json({ status: "unreachable" as WebsiteStatus, error: e instanceof Error ? e.message : "Check failed.", checkedAt: new Date().toISOString() }, { status: 200 });
    }
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
