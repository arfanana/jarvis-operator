import { describe, expect, it } from "vitest";
import { SITE_PRESETS, SITE_SLUGS, whatsappFor } from "@/lib/site-templates";

describe("site templates", () => {
  it("ships four templates", () => {
    expect(SITE_SLUGS.sort()).toEqual(["gym", "restaurant", "salon", "tooth-medic"]);
  });
  it("tooth-medic uses only real facts", () => {
    const t = SITE_PRESETS["tooth-medic"];
    expect(t.sample).toBe(false);
    expect(t.phoneDisplay).toBe("+91 70752 29333");
    const blob = JSON.stringify(t).toLowerCase();
    for (const b of ["award", "years of experience", "patients", "painless", "#1", "lorem"]) {
      expect(blob).not.toContain(b);
    }
  });
  it("samples are flagged with fictional contacts", () => {
    for (const slug of ["restaurant", "salon", "gym"]) {
      const t = SITE_PRESETS[slug];
      expect(t.sample).toBe(true);
      expect(t.phoneDisplay).toMatch(/^\+91 90000/);
      expect(t.services.length).toBeGreaterThanOrEqual(4);
      expect(t.faqs.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("builds valid per-business WhatsApp links", () => {
    const t = SITE_PRESETS.salon;
    const url = whatsappFor(t, "Hello test");
    expect(url.startsWith("https://wa.me/919000000002?text=")).toBe(true);
  });
});
