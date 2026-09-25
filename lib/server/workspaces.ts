import { getDb, getUserDb, toDbError } from "@/lib/server/db";
import type { OperatorIdentity } from "@/lib/server/auth";
import { err } from "@/lib/server/errors";

// Workspace resolution: every business record belongs to a workspace;
// users only access workspaces they belong to (workspace_members).
export async function listUserWorkspaces(op: OperatorIdentity): Promise<{ id: string; name: string; role: string }[]> {
  if (op.dev) return [{ id: "demo-workspace", name: "Demo workspace", role: "owner" }];
  if (!op.jwt) throw err("authentication", "Authentication required.");
  try {
    const db = getUserDb(op.jwt);
    const { data, error } = await db
      .from("workspace_members")
      .select("role, workspaces(id, name)")
      .eq("user_id", op.id);
    if (error) throw error;
    return (data ?? []).map((r: { role: string; workspaces: { id: string; name: string } | { id: string; name: string }[] }) => {
      const w = Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces;
      return { id: w.id, name: w.name, role: r.role };
    });
  } catch (e) {
    if (e instanceof Error && "code" in e) throw e;
    toDbError(e, "Could not list workspaces.");
  }
}

/** Resolve the active workspace (explicit header > first membership > auto-provision). */
export async function resolveWorkspace(req: Request, op: OperatorIdentity): Promise<string> {
  if (op.dev) return "demo-workspace";
  const explicit = req.headers.get("x-workspace-id")?.trim();
  const owned = await listUserWorkspaces(op);
  if (explicit) {
    if (!owned.some((w) => w.id === explicit)) throw err("authorization", "Not a member of that workspace.");
    return explicit;
  }
  if (owned.length) return owned[0].id;
  // Auto-provision a personal workspace on first use.
  try {
    const db = getDb();
    const { data: ws, error: wErr } = await db.from("workspaces").insert({ name: "My workspace", owner_id: op.id }).select("id").single();
    if (wErr) throw wErr;
    const { error: mErr } = await db.from("workspace_members").insert({ workspace_id: (ws as { id: string }).id, user_id: op.id, role: "owner" });
    if (mErr) throw mErr;
    return (ws as { id: string }).id;
  } catch (e) {
    toDbError(e, "Could not provision workspace.");
  }
}

export async function assertWorkspaceMember(op: OperatorIdentity, workspaceId: string): Promise<void> {
  if (op.dev) return;
  const owned = await listUserWorkspaces(op);
  if (!owned.some((w) => w.id === workspaceId)) throw err("authorization", "Not a member of that workspace.");
}
