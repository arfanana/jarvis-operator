import { describe, expect, it } from "vitest";
import { DemoBusinessProvider } from "@/lib/server/business-search";
import { ApiError, err, toErrorResponse } from "@/lib/server/errors";
import { explainScore } from "@/lib/lead-utils";
import { rateLimit } from "@/lib/server/rate-limit";
import { qrDataUrl } from "@/lib/server/qr";
import type { Lead } from "@/lib/types";

const lead = (p: Partial<Lead> = {}): Lead => ({
  id: "t1", name: "Test Biz", category: "Dental", city: "Kukatpally", region: "Hyderabad",
  score: 70, conversion_probability: 0.7, status: "new", assigned_to: "u2",
  created_at: new Date().toISOString(), ...p,
});

describe("demo business provider", () => {
  it("returns labeled demo-shaped results with place ids", async () => {
    const p = new DemoBusinessProvider();
    const out = await p.search({ text: "dental", location: "Kukatpally" });
    expect(out.length).toBeGreaterThan(5);
    expect(out[0].name).toBeTruthy();
    expect(out[0].placeId).toMatch(/^demo-/);
  });
  it("honors min rating filter", async () => {
    const p = new DemoBusinessProvider();
    const out = await p.search({ text: "salon", location: "Secunderabad", minRating: 4.5 });
    expect(out.every((r) => (r.rating ?? 0) >= 4.5)).toBe(true);
  });
});

describe("error model", () => {
  it("maps codes to statuses without leaking internals", () => {
    const cases: [string, number][] = [
      ["validation", 400], ["authentication", 401], ["authorization", 403],
      ["rate_limited", 429], ["provider", 502], ["database", 503],
      ["ai", 502], ["deployment", 502], ["not_configured", 503], ["internal", 500],
    ];
    for (const [code, status] of cases) {
      const r = toErrorResponse(err(code as never, "msg"));
      expect(r.status).toBe(status);
      expect(r.body.error.code).toBe(code);
    }
  });
  it("never exposes stack traces for unknown errors", () => {
    const r = toErrorResponse(new Error("secret service_role key=abc\n    at foo"));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("service_role");
    expect(JSON.stringify(r.body)).not.toContain(" at ");
  });
  it("preserves ApiError messages", () => {
    const r = toErrorResponse(new ApiError("validation", "name is required."));
    expect(r.body.error.message).toBe("name is required.");
  });
});

describe("score explanation", () => {
  it("partitions into positives/negatives/missing covering all signals", () => {
    const { score, positives, negatives, missing, breakdown } = explainScore(lead({ phone: "+91", website: undefined }));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(positives.length + negatives.length + missing.length).toBe(breakdown.length);
    expect(breakdown.every((b) => b.signal === "positive" || b.signal === "negative" || b.signal === "missing")).toBe(true);
  });
  it("never claims calibration", () => {
    const { breakdown } = explainScore(lead());
    expect(JSON.stringify(breakdown).toLowerCase()).not.toContain("conversion probability");
  });
});

describe("rate limits", () => {
  it("enforces named limits", () => {
    const key = `test-${Date.now()}`;
    expect(rateLimit(key, { limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit(key, { limit: 2, windowMs: 60_000 }).ok).toBe(true);
    const third = rateLimit(key, { limit: 2, windowMs: 60_000 });
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });
});

describe("local QR generation", () => {
  it("produces a PNG data URL with no network", async () => {
    const url = await qrDataUrl("upi://pay?pa=shop@upi&pn=Shop&am=100.00&cu=INR");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    expect(url.length).toBeGreaterThan(1000);
  }, 15000);
});
