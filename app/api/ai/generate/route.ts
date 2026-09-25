import { NextResponse } from "next/server";
import { aiConfigFromEnv, buildPrompt, chatCompletion } from "@/lib/server/ai-provider";
import { requireOperator } from "@/lib/server/auth";
import { enforceLimit } from "@/lib/server/rate-limit";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";
import { dbEnabled } from "@/lib/server/db";

const OPS = ["audit", "enrich", "outreach", "proposal", "followup", "demo", "summarize", "next_action"] as const;

export async function POST(req: Request) {
  try {
    await requireOperator(req);
    enforceLimit("ai", req);
    const body = (await req.json().catch(() => ({}))) as { op?: string; lead?: Record<string, unknown>; tone?: string; language?: string; channel?: string; audit?: unknown; category?: string };
    capPayload(body, 20_000);
    if (!body.op || !(OPS as readonly string[]).includes(body.op)) throw err("validation", "Invalid op.");
    if (!body.lead || typeof body.lead !== "object") throw err("validation", "Lead object required.");
    const { config, error } = aiConfigFromEnv();
    if (!config) throw err("not_configured", error ?? "AI is not configured. Set AI_API_KEY on the server.");
    try {
      const { system, user } = buildPrompt(String(body.op), body.lead, { tone: body.tone, language: body.language, channel: body.channel, audit: body.audit, category: body.category });
      const out = await chatCompletion({ config, system, user, maxTokens: body.op === "demo" ? 2000 : 800 });
      if (dbEnabled()) {
        try {
          const { getDb } = await import("@/lib/server/db");
          const { resolveWorkspace } = await import("@/lib/server/workspaces");
          const { insertRow } = await import("@/lib/server/repos");
          const op = await requireOperator(req);
          const ws = await resolveWorkspace(req, op);
          await insertRow(op, "ai_generations", ws, {
            lead_id: typeof (body.lead as Record<string, unknown>).id === "string" ? (body.lead as Record<string, unknown>).id : null,
            op: body.op, provider: out.provider, model: out.model, output: out.text.slice(0, 8000),
          }).catch(() => {});
          void getDb;
        } catch { /* usage logging must not fail the request */ }
      }
      return NextResponse.json({ ...out, promptVersion: "jarvis-ai-v1" });
    } catch (e) {
      const r = toErrorResponse(e);
      // Normalize provider failures to the ai code (never leak key/URL).
      if (r.body.error.code === "internal") r.body.error = { code: "ai", message: "AI provider failed. Try again." };
      return NextResponse.json(r.body, { status: r.status === 500 ? 502 : r.status });
    }
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
