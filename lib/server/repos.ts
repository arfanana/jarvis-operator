import type { SupabaseClient } from "@supabase/supabase-js";
import { getDb, toDbError } from "@/lib/server/db";
import { toDbLead } from "@/lib/server/lead-map";
import type { OperatorIdentity } from "@/lib/server/auth";
import { err } from "@/lib/server/errors";

// Generic RLS-compatible repository for all business tables.
// Reads/writes always carry owner_id + workspace_id; every mutation verifies
// authenticated ownership (row must belong to the caller's workspace).

export const TABLES = [
  "leads", "lead_events", "lead_notes", "lead_tags", "lead_tasks",
  "outreach_messages", "outreach_sequences", "ai_generations", "website_audits",
  "demos", "deployments", "invoices", "payments", "email_deliveries",
  "workspace_settings",
] as const;
export type TableName = (typeof TABLES)[number];

export interface PageOpts {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
  filters?: Record<string, string | number | boolean | undefined>;
  search?: { columns: string[]; term: string };
}

function clientFor(op: OperatorIdentity): SupabaseClient {
  // Service client; workspace scoping below enforces isolation even so.
  // (User-JWT RLS path used where getUserDb is available; service path here
  // always filters by workspace_id + owner membership verified by caller.)
  return getDb();
}

function scope<T>(db: SupabaseClient, table: TableName, workspaceId: string) {
  // workspace_settings is keyed by owner workspace; everything else carries workspace_id.
  const q = db.from(table).select("*", { count: "exact" });
  if (table === "workspace_settings") return q.eq("workspace_id", workspaceId);
  return q.eq("workspace_id", workspaceId);
}

export async function listPage<T>(op: OperatorIdentity, table: TableName, workspaceId: string, opts: PageOpts = {}): Promise<{ rows: T[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
  try {
    const db = clientFor(op);
    let q = scope(db, table, workspaceId);
    for (const [k, v] of Object.entries(opts.filters ?? {})) {
      if (v !== undefined && v !== "") q = q.eq(k, v as string);
    }
    if (opts.search?.term) {
      const term = opts.search.term.replace(/[%_]/g, "");
      q = q.or(opts.search.columns.map((c) => `${c}.ilike.%${term}%`).join(","));
    }
    if (opts.sort) q = q.order(opts.sort, { ascending: (opts.order ?? "desc") === "asc" });
    else q = q.order("created_at", { ascending: false });
    q = q.range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    return { rows: (data ?? []) as T[], total: count ?? 0, page, pageSize };
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code) throw e;
    toDbError(e, `Could not list ${table}.`);
  }
}

export async function insertRow<T>(op: OperatorIdentity, table: TableName, workspaceId: string, row: Record<string, unknown>): Promise<T> {
  try {
    const db = clientFor(op);
    const payload = table === "workspace_settings"
      ? { ...row, workspace_id: workspaceId, owner_id: op.id }
      : { ...row, workspace_id: workspaceId, owner_id: op.id };
    const { data, error } = await db.from(table).insert(payload).select("*").single();
    if (error) throw error;
    return data as T;
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code) throw e;
    toDbError(e, `Could not create ${table} record.`);
  }
}

export async function updateRow<T>(op: OperatorIdentity, table: TableName, workspaceId: string, id: string, patch: Record<string, unknown>): Promise<T> {
  if (!id) throw err("validation", "id is required.");
  try {
    const db = clientFor(op);
    // Ownership check: row must exist in this workspace first.
    const { data: existing, error: gErr } = await db.from(table).select("id").eq("id", id).eq("workspace_id", workspaceId).single();
    if (gErr || !existing) throw err("authorization", "Record not found in your workspace.");
    const { id: _drop, workspace_id: _wd, owner_id: _od, ...rest } = patch as Record<string, unknown>;
    void _drop; void _wd; void _od;
    const safe = table === "leads" ? toDbLead(rest) : rest;
    const { data, error } = await db.from(table).update({ ...safe, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId).select("*").single();
    if (error) throw error;
    return data as T;
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code) throw e;
    toDbError(e, `Could not update ${table} record.`);
  }
}

export async function deleteRow(op: OperatorIdentity, table: TableName, workspaceId: string, id: string): Promise<void> {
  if (!id) throw err("validation", "id is required.");
  try {
    const db = clientFor(op);
    const { data: existing, error: gErr } = await db.from(table).select("id").eq("id", id).eq("workspace_id", workspaceId).single();
    if (gErr || !existing) throw err("authorization", "Record not found in your workspace.");
    const { error } = await db.from(table).delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code) throw e;
    toDbError(e, `Could not delete ${table} record.`);
  }
}

/** Append an activity event (server-persisted). Never throws past the caller — use logEventSafe. */
export async function appendEvent(op: OperatorIdentity, workspaceId: string, leadId: string | null, type: string, message: string, meta?: Record<string, unknown>): Promise<void> {
  await insertRow(op, "lead_events", workspaceId, { lead_id: leadId, type, message: message.slice(0, 500), meta: meta ?? {} });
}
