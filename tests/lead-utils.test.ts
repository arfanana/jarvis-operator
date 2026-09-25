import { describe, expect, it } from "vitest";
import {
  normalizePhone, phoneKey, normalizeName, normalizeDomain, normalizeUrl,
  parsePasteLinks, parseMapsDetails, detectDuplicates, opportunityScoreFor,
  leadsToCSV, leadsToJSON, calcInvoice, upiLink,
} from "@/lib/lead-utils";
import type { Lead } from "@/lib/types";

const lead = (p: Partial<Lead> = {}): Lead => ({
  id: "t1", name: "Test Biz", category: "Dental", city: "Hyderabad", region: "Telangana",
  score: 70, conversion_probability: 0.7, status: "new", assigned_to: "u2", created_at: new Date().toISOString(), ...p,
});

describe("phone normalization", () => {
  it("strips formatting", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(phoneKey("098765 43210")).toBe(phoneKey("+91-9876543210"));
  });
});

describe("name/domain normalization", () => {
  it("normalizes business names", () => {
    expect(normalizeName("Sharma Dental Clinic Pvt. Ltd.")).toBe(normalizeName("sharma dental"));
  });
  it("extracts domains", () => {
    expect(normalizeDomain("https://WWW.Example.com/menu?utm_source=x")).toBe("example.com");
    expect(normalizeDomain("example.in")).toBe("example.in");
  });
  it("normalizes urls", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });
});

describe("paste links parser", () => {
  it("imports multiple urls", () => {
    const out = parsePasteLinks("https://a.com\nhttps://b.in/menu, www.c.com");
    expect(out.length).toBe(3);
    expect(out[0].domain).toBe("a.com");
  });
  it("dedupes", () => {
    expect(parsePasteLinks("https://a.com\nhttps://a.com")).toHaveLength(1);
  });
});

describe("maps details parser", () => {
  it("parses multiple businesses", () => {
    const text = "Sharma Dental\n4.3 (212) · Dental Clinic\nKukatpally\nPhone: +91 98765 43210\nhttps://sharma.in\n\nCity Salon\n4.8 (99)\nSecunderabad";
    const out = parseMapsDetails(text);
    expect(out.length).toBe(2);
    expect(out[0].name).toContain("Sharma");
    expect(out[0].rating).toBeCloseTo(4.3);
  });
});

describe("duplicate detection", () => {
  const existing = [lead({ id: "e1", name: "Sharma Dental", phone: "+91 9876543210", website: "https://sharma.in" })];
  it("matches phone", () => {
    expect(detectDuplicates({ phone: "09876543210" }, existing)[0].reasons).toContain("phone");
  });
  it("matches normalized name", () => {
    expect(detectDuplicates({ name: "sharma dental clinic" }, existing)[0].reasons).toContain("name");
  });
  it("matches domain", () => {
    expect(detectDuplicates({ website: "http://www.sharma.in/menu" }, existing)[0].reasons).toContain("domain");
  });
});

describe("opportunity score", () => {
  it("returns 0-100 with 6-part breakdown", () => {
    const { score, breakdown } = opportunityScoreFor(lead({ phone: "+91", email: "a@b.com", website: undefined }));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(breakdown.map((b) => b.label)).toEqual(["Search fit", "Business signals", "Contactability", "Website opportunity", "Review/reputation", "Location fit"]);
  });
});

describe("csv/json export", () => {
  it("exports real csv", () => {
    const csv = leadsToCSV([lead({ name: "A,B \"Quoted\"" })]);
    expect(csv).toContain("opportunity_score");
    expect(csv).toContain('"A,B ""Quoted"""');
  });
  it("exports json", () => {
    expect(JSON.parse(leadsToJSON([lead()])).length).toBe(1);
  });
});

describe("invoice + upi", () => {
  it("calculates totals with optional gst", () => {
    const c = calcInvoice([{ label: "Site", qty: 1, rate: 1000 }], { discount: 100, gstEnabled: true, gstRate: 18 });
    expect(c.subtotal).toBe(1000);
    expect(c.taxable).toBe(900);
    expect(c.gstAmount).toBe(162);
    expect(c.total).toBe(1062);
    const nogst = calcInvoice([{ label: "Site", qty: 1, rate: 1000 }], { gstEnabled: false });
    expect(nogst.gstAmount).toBe(0);
  });
  it("builds upi link without third parties", () => {
    const u = upiLink({ payeeVpa: "shop@upi", payeeName: "Shop", amount: 1062, note: "INV-1" });
    expect(u.startsWith("upi://pay?")).toBe(true);
    expect(u).toContain("pa=shop");
  });
});
