import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/auth";
import { enforceLimit } from "@/lib/server/rate-limit";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";
import { dbEnabled, demoPersistenceEnabled } from "@/lib/server/db";
import { appendEvent, deleteRow, updateRow } from "@/lib/server/repos";
import { resolveWorkspace } from "@/lib/server/workspaces";

function guardDb() {
  if (!dbEnabled()) {
    if (demoPersistenceEnabled()) throw err("not_configured", "Database not configured — explicit demo storage is active.");
    throw err("not_configured", "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const op = await requireOperator(req);
    enforceLimit("leads_write", req);
    guardDb();
    const ws = await resolveWorkspace(req, op);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    capPayload(body, 20_000);
    const updated = await updateRow(op, "leads", ws, params.id, body);
    if (body.status) await appendEvent(op, ws, params.id, "stage_changed", `Stage → ${String(body.status).slice(0, 40)}`).catch(() => {});
    else await appendEvent(op, ws, params.id, "lead_updated", "Lead updated.").catch(() => {});
    return NextResponse.json(updated);
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const op = await requireOperator(req);
    enforceLimit("leads_write", req);
    guardDb();
    const ws = await resolveWorkspace(req, op);
    await deleteRow(op, "leads", ws, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
