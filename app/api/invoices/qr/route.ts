import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/server/auth";
import { capPayload, err, toErrorResponse } from "@/lib/server/errors";
import { qrDataUrl } from "@/lib/server/qr";

// POST /api/invoices/qr { upiUri } → { dataUrl } — 100% local generation.
export async function POST(req: Request) {
  try {
    await requireOperator(req);
    const body = (await req.json().catch(() => ({}))) as { upiUri?: string };
    capPayload(body, 5_000);
    if (!body.upiUri || typeof body.upiUri !== "string" || !body.upiUri.startsWith("upi://pay?")) {
      throw err("validation", "A valid upi://pay URI is required.");
    }
    const dataUrl = await qrDataUrl(body.upiUri);
    return NextResponse.json({ dataUrl });
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json(r.body, { status: r.status });
  }
}
