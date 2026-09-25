import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/auth";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";
import { dbEnabled, demoPersistenceEnabled } from "@/lib/server/db";
import { insertRow, listPage } from "@/lib/server/repos";
import { resolveWorkspace } from "@/lib/server/workspaces";

const TYPES = [
  "lead_created", "lead_imported", "lead_enriched", "lead_scored", "lead_updated",
  "website_checked", "audit_generated", "score_updated", "outreach_generated",
  "whatsapp_opened", "email_sent", "email_failed", "reply_recorded",
  "proposal_created", "proposal_generated", "proposal_sent",
  "demo_created", "demo_generated", "demo_deployed",
  "invoice_created", "payment_recorded", "stage_changed",
  "note_added", "task_created", "task_completed",
] as const;

export async function GET(req: Request) {
  try {
    const op = await requireOperator(req);
    if (!dbEnabled()) {
      if (demoPersistenceEnabled()) throw err("not_configured", "Activity persistence needs Supabase — demo events stay local.");
      throw err("not_configured", "Database not configured.");
    }
    const ws = await resolveWorkspace(req, op);
    const u = new URL(req.url);
    const rows = await listPage(op, "lead_events", ws, {
      page: Number(u.searchParams.get("page") ?? "1"),
      pageSize: Number(u.searchParams.get("pageSize") ?? "50"),
      sort: "created_at",
      order: "desc",
      filters: {
        ...(u.searchParams.get("lead_id") ? { lead_id: u.searchParams.get("lead_id") as string } : {}),
        ...(u.searchParams.get("type") ? { type: u.searchParams.get("type") as string } : {}),
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}

export async function POST(req: Request) {
  try {
    const op = await requireOperator(req);
    if (!dbEnabled()) throw err("not_configured", "Activity persistence needs Supabase.");
    const ws = await resolveWorkspace(req, op);
    const body = (await req.json().catch(() => ({}))) as { lead_id?: string | null; type?: string; message?: string; meta?: Record<string, unknown> };
    capPayload(body, 10_000);
    if (!body.type || !(TYPES as readonly string[]).includes(body.type)) throw err("validation", "Valid event type is required.");
    if (!body.message || typeof body.message !== "string") throw err("validation", "message is required.");
    const rec = await insertRow(op, "lead_events", ws, {
      lead_id: body.lead_id ?? null,
      type: body.type,
      message: body.message.slice(0, 500),
      meta: body.meta ?? {},
    });
    return NextResponse.json(rec, { status: 201 });
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
