import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/auth";
import { enforceLimit } from "@/lib/server/rate-limit";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";
import { dbEnabled, getDb } from "@/lib/server/db";
import { demoPersistenceEnabled } from "@/lib/server/db";
import { appendEvent, insertRow, listPage, updateRow } from "@/lib/server/repos";
import { resolveWorkspace } from "@/lib/server/workspaces";
import { toDbLead } from "@/lib/server/lead-map";

function guardDb() {
  if (!dbEnabled()) {
    if (demoPersistenceEnabled()) throw err("not_configured", "Database not configured — explicit demo storage is active.");
    throw err("not_configured", "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
}

// Map client Lead shape → DB row (drops client-only keys, keeps known columns).
function toRow(b: Record<string, unknown>): Record<string, unknown> {
  return toDbLead(b);
}

export async function GET(req: Request) {
  try {
    const op = await requireOperator(req);
    guardDb();
    const ws = await resolveWorkspace(req, op);
    const u = new URL(req.url);
    const rows = await listPage(op, "leads", ws, {
      page: Number(u.searchParams.get("page") ?? "1"),
      pageSize: Number(u.searchParams.get("pageSize") ?? "50"),
      sort: u.searchParams.get("sort") ?? undefined,
      order: (u.searchParams.get("order") as "asc" | "desc" | null) ?? undefined,
      filters: {
        status: u.searchParams.get("status") ?? undefined,
        website_status: u.searchParams.get("website_status") ?? undefined,
      },
      search: u.searchParams.get("q") ? { columns: ["name", "category", "city"], term: u.searchParams.get("q") as string } : undefined,
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
    enforceLimit("leads_write", req);
    guardDb();
    const ws = await resolveWorkspace(req, op);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown> | Record<string, unknown>[];
    capPayload(body, 100_000);
    const items = Array.isArray(body) ? body : [body];
    if (!items.length || items.length > 100) throw err("validation", "Provide 1–100 leads.");
    for (const it of items) {
      if (!it || typeof it !== "object" || !(it as Record<string, unknown>).name) throw err("validation", "Each lead needs a name.");
    }
    const db = getDb();
    // Server-side dedupe: phone / normalized name / domain / place_id within workspace.
    const created: unknown[] = [];
    let skipped = 0;
    for (const it of items as Record<string, unknown>[]) {
      const row = toRow(it);
      let dup = false;
      try {
        const checks: Promise<{ data?: unknown[] }>[] = [];
        if (row.phone) checks.push(Promise.resolve(db.from("leads").select("id").eq("workspace_id", ws).eq("phone", row.phone).limit(1)).then((r) => r as { data?: unknown[] }));
        if (row.place_id) checks.push(Promise.resolve(db.from("leads").select("id").eq("workspace_id", ws).eq("place_id", row.place_id).limit(1)).then((r) => r as { data?: unknown[] }));
        if (row.website) {
          const dom = String(row.website).replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
          checks.push(Promise.resolve(db.from("leads").select("id").eq("workspace_id", ws).ilike("website", `%${dom}%`).limit(1)).then((r) => r as { data?: unknown[] }));
        }
        const res = await Promise.all(checks);
        dup = res.some((r) => r.data?.length);
      } catch { dup = false; }
      if (dup) { skipped += 1; continue; }
      const rec = await insertRow(op, "leads", ws, row);
      created.push(rec);
      const recId = (rec as { id?: string }).id ?? null;
      await appendEvent(op, ws, recId, "lead_created", `Lead created: ${String(row.name ?? "—").slice(0, 120)}`).catch(() => {});
    }
    return NextResponse.json({ created, skipped }, { status: 201 });
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
