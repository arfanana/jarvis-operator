import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/auth";
import { enforceLimit } from "@/lib/server/rate-limit";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";
import { dbEnabled } from "@/lib/server/db";
import { appendEvent } from "@/lib/server/repos";
import { resolveWorkspace } from "@/lib/server/workspaces";

// Email sending happens server-side via Resend. WhatsApp is user-controlled (link only).
export async function POST(req: Request) {
  try {
    const op = await requireOperator(req);
    enforceLimit("email", req);
    const body = (await req.json().catch(() => ({}))) as { to?: string; subject?: string; body?: string; leadId?: string };
    capPayload(body, 30_000);
    if (!body.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.to)) throw err("validation", "Valid 'to' email required.");
    if (!body.subject || !body.body) throw err("validation", "subject and body required.");
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "Jarvis <noreply@example.com>";
    if (!key) throw err("not_configured", "Email not configured. Set RESEND_API_KEY and EMAIL_FROM on the server.");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: body.to, subject: body.subject.slice(0, 200), text: body.body.slice(0, 10_000) }),
    });
    const ws = dbEnabled() ? await resolveWorkspace(req, op).catch(() => null) : null;
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (ws && body.leadId) await appendEvent(op, ws, body.leadId, "email_failed", `Email failed (${res.status}).`).catch(() => {});
      throw err("provider", `Email provider error (${res.status}).`, t.slice(0, 200));
    }
    const j = (await res.json()) as { id?: string };
    if (ws) {
      const { insertRow } = await import("@/lib/server/repos");
      await insertRow(op, "email_deliveries", ws, { lead_id: body.leadId ?? null, to_email: body.to, subject: body.subject.slice(0, 200), status: "sent", provider_id: j.id ?? null }).catch(() => {});
      if (body.leadId) await appendEvent(op, ws, body.leadId, "email_sent", `Email sent to ${body.to}.`).catch(() => {});
    }
    return NextResponse.json({ status: "sent", deliveryId: j.id ?? null });
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
