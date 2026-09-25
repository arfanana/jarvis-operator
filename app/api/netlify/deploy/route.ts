import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/auth";
import { enforceLimit } from "@/lib/server/rate-limit";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";
import { dbEnabled } from "@/lib/server/db";
import { appendEvent, insertRow } from "@/lib/server/repos";
import { resolveWorkspace } from "@/lib/server/workspaces";

// Netlify deployment stays server-side (token never touches the browser).
// Reuses an existing site when siteId is provided instead of creating duplicates.
export async function POST(req: Request) {
  try {
    const op = await requireOperator(req);
    enforceLimit("deploy", req);
    const body = (await req.json().catch(() => ({}))) as { siteId?: string; siteName?: string; html?: string; files?: Record<string, string>; leadId?: string; title?: string };
    capPayload(body, 600_000);
    const token = process.env.NETLIFY_TOKEN;
    if (!token) throw err("not_configured", "Netlify not configured. Set NETLIFY_TOKEN on the server.");
    // Single page (legacy) or multi-page site: { "index.html": ..., "services.html": ... }
    const files: Record<string, string> = body.files && typeof body.files === "object"
      ? body.files
      : body.html ? { "index.html": body.html } : {};
    const names = Object.keys(files).filter((k) => typeof files[k] === "string" && files[k].length >= 50 && files[k].length <= 500_000);
    if (!names.length || names.length > 12) throw err("validation", "Provide 1–12 html files (50–500k chars each).");
    for (const n of names) {
      if (!/^[a-z0-9_-]+\.html$/i.test(n)) throw err("validation", `Bad filename: ${n}.`);
    }
    const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    let siteId = body.siteId ?? "";
    let siteUrl = "";
    if (!siteId) {
      const name = (body.siteName ?? `jarvis-demo-${Date.now().toString(36)}`).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40);
      const s = await fetch("https://api.netlify.com/api/v1/sites", { method: "POST", headers: H, body: JSON.stringify({ name }) });
      if (!s.ok) throw err("deployment", `Netlify site create failed (${s.status}).`);
      const sj = (await s.json()) as { id?: string; url?: string; ssl_url?: string };
      siteId = sj.id ?? "";
      siteUrl = sj.ssl_url ?? sj.url ?? "";
    } else {
      const g = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (g.ok) {
        const gj = (await g.json()) as { url?: string; ssl_url?: string };
        siteUrl = gj.ssl_url ?? gj.url ?? "";
      }
    }
    // Deploy via digest-free file deploy: simplest is a zip deploy; here we record an update deploy
    // using Netlify's file-digest API would need shas — instead create a deploy with inline function-less files
    // Fallback: use the `netlify` API "createSiteDeploy" with a files manifest computed server-side.
    const crypto = await import("node:crypto");
    const manifest: Record<string, string> = {};
    for (const n of names) manifest[n] = crypto.createHash("sha1").update(files[n]).digest("hex");
    const d = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST", headers: H, body: JSON.stringify({ files: manifest }),
    });
    if (!d.ok) throw err("deployment", `Netlify deploy init failed (${d.status}).`);
    const dj = (await d.json()) as { id?: string; required?: string[] };
    for (const n of names) {
      if (!dj.required?.includes(manifest[n])) continue;
      const put = await fetch(`https://api.netlify.com/api/v1/deploys/${dj.id}/files/${n}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/html" }, body: files[n],
      });
      if (!put.ok) throw err("deployment", `Netlify file upload failed (${n}: ${put.status}).`);
    }
    // Persist deployment record (server-side, workspace-scoped).
    if (dbEnabled()) {
      try {
        const ws = await resolveWorkspace(req, op);
        await insertRow(op, "deployments", ws, { site_id: siteId, deployment_id: dj.id ?? null, url: siteUrl, status: "deployed" });
        if (body.leadId) await appendEvent(op, ws, body.leadId, "demo_deployed", `Deployed to ${siteUrl || siteId}`).catch(() => {});
      } catch { /* record-keeping must not fail the deploy */ }
    }
    return NextResponse.json({ siteId, deploymentId: dj.id ?? null, url: siteUrl, deployedAt: new Date().toISOString(), status: "deployed", pages: names });
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
