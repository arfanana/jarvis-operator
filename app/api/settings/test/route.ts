import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/errors";

type Status = "Connected" | "Missing" | "Error";
interface Check { status: Status; detail: string; }

// GET /api/settings/test?which=all|ai|supabase|search|email|netlify
// Reports connectivity WITHOUT exposing secret values (presence only).
export async function GET(req: Request) {
  try {
    await requireOperator(req);
    const u = new URL(req.url);
    const which = u.searchParams.get("which") ?? "all";
    const want = (k: string) => which === "all" || which === k;
    const out: Record<string, Check> = {};

    if (want("supabase") || want("database")) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon) {
        out.supabase = { status: "Missing", detail: "Set NEXT_PUBLIC_SUPABASE_URL + ANON_KEY (+ SUPABASE_SERVICE_ROLE_KEY for server writes)" };
      } else {
        try {
          const r = await fetch(`${url}/rest/v1/leads?select=id&limit=1`, {
            headers: { apikey: anon, Authorization: `Bearer ${anon}` },
            signal: AbortSignal.timeout(8000),
          });
          out.supabase = r.ok || r.status === 406 || r.status === 404
            ? { status: "Connected", detail: "Supabase reachable" }
            : { status: "Error", detail: `Supabase returned ${r.status}` };
        } catch {
          out.supabase = { status: "Error", detail: "Supabase unreachable" };
        }
      }
    }

    if (want("ai")) {
      const aiKey = process.env.AI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
      if (!aiKey) {
        out.ai = { status: "Missing", detail: "Set AI_PROVIDER, AI_BASE_URL, AI_API_KEY, AI_MODEL" };
      } else if (which === "ai") {
        try {
          const base = process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1";
          const r = await fetch(`${base.replace(/\/$/, "")}/models`, {
            headers: { Authorization: `Bearer ${aiKey}` },
            signal: AbortSignal.timeout(8000),
          });
          out.ai = r.ok ? { status: "Connected", detail: `provider=${process.env.AI_PROVIDER ?? "openrouter"} reachable` } : { status: "Error", detail: `provider returned ${r.status}` };
        } catch {
          out.ai = { status: "Error", detail: "AI provider unreachable" };
        }
      } else {
        out.ai = { status: "Connected", detail: `provider=${process.env.AI_PROVIDER ?? "openrouter"} model=${process.env.AI_MODEL ?? "openai/gpt-4o-mini"} (key present)` };
      }
    }

    if (want("search")) {
      const mode = (process.env.BUSINESS_SEARCH_PROVIDER ?? "auto").toLowerCase();
      const gkey = process.env.PLACES_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? "";
      const akey = process.env.GEOAPIFY_API_KEY ?? "";
      if (mode === "google" && !gkey) out.search = { status: "Error", detail: "BUSINESS_SEARCH_PROVIDER=google but PLACES_API_KEY missing" };
      else if (mode === "geoapify" && !akey) out.search = { status: "Error", detail: "BUSINESS_SEARCH_PROVIDER=geoapify but GEOAPIFY_API_KEY missing (free at geoapify.com)" };
      else if (mode === "google" || (mode === "auto" && gkey)) out.search = { status: "Connected", detail: "Google Places (live)" };
      else if (mode === "geoapify" || (mode === "auto" && akey)) out.search = { status: "Connected", detail: "Geoapify Places (live, free key)" };
      else if (mode === "demo") out.search = { status: "Connected", detail: "Demo provider (DEMO DATA) — explicit mode" };
      else out.search = { status: "Connected", detail: "OpenStreetMap Overpass (live, free, no key — can be slow)" };
    }

    if (want("email")) {
      out.email = process.env.RESEND_API_KEY
        ? { status: "Connected", detail: `key present, from=${process.env.EMAIL_FROM ?? "unset"}` }
        : { status: "Missing", detail: "Set RESEND_API_KEY, EMAIL_FROM" };
    }

    if (want("netlify") || want("deployment")) {
      out.netlify = process.env.NETLIFY_TOKEN
        ? { status: "Connected", detail: "token present (server-only)" }
        : { status: "Missing", detail: "Set NETLIFY_TOKEN" };
    }

    // Back-compat aliases for the existing settings UI.
    if (out.supabase && !out.database) out.database = out.supabase;
    if (out.netlify && !out.deployment) out.deployment = out.netlify;

    return NextResponse.json(out);
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
