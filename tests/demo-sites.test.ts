import { describe, expect, it } from "vitest";
import { defaultDemoContent, parseDemoContent, renderDemoSite, sanitizeTheme, toothMedicSiteContent } from "@/lib/demo-sites";

const fb = defaultDemoContent("Sharma Dental", "Kukatpally", "+91 999", "Dental Clinic");

describe("demo content parsing", () => {
  it("parses strict AI JSON", () => {
    const json = JSON.stringify({
      business: "Sharma Dental", tagline: "Painless dentistry in Kukatpally.", intro: "We fix teeth without drama.",
      phone: "+91 999", address: "Kukatpally", hours: [{ days: "Mon–Sat", time: "10-8" }],
      areas: ["Kukatpally"], services: [{ name: "Cleaning", desc: "Polish and checkup.", price: "₹800" }],
      testimonials: [{ name: "Ravi K.", text: "Done same day.", rating: 5 }],
      faqs: [{ q: "Walk-ins?", a: "Yes." }], about: "Neighbourhood clinic.",
    });
    const c = parseDemoContent(json, fb);
    expect(c.tagline).toContain("Painless");
    expect(c.services[0].price).toBe("₹800");
  });
  it("falls back on garbage", () => {
    expect(parseDemoContent("not json at all", fb).business).toBe("Sharma Dental");
  });
  it("strips slop: emojis, lorem, buzzwords", () => {
    const json = JSON.stringify({ ...fb, tagline: "✨ Best cutting-edge dental!!! lorem ipsum dolor", intro: "Seamless vibrant smiles nestled here." });
    const c = parseDemoContent(json, fb);
    expect(c.tagline).not.toMatch(/✨|cutting-edge|lorem/i);
    expect(c.tagline).not.toContain("!");
    expect(c.intro).not.toMatch(/seamless|vibrant|nestled/i);
  });
});

describe("demo renderer", () => {
  const pages = renderDemoSite(fb, { accent: "#0ea5e9", headingFont: "sans", bodyFont: "sans", baseSize: 16, radius: 10 });
  it("renders four linked pages", () => {
    expect(Object.keys(pages).sort()).toEqual(["contact.html", "index.html", "reviews.html", "services.html"]);
    for (const html of Object.values(pages)) {
      for (const p of ["index.html", "services.html", "reviews.html", "contact.html"]) {
        expect(html).toContain(`href="${p}"`);
      }
    }
  });
  it("contains no vibe-coded elements", () => {
    const all = Object.values(pages).join("\n");
    expect(all).not.toMatch(/linear-gradient/i);
    expect(all).not.toMatch(/lorem ipsum/i);
    expect(all).not.toMatch(/[\uD800-\uDBFF][\uDC00-\uDFFF]/);
  });
  it("is interactable: menu, form, faq, call links", () => {
    expect(pages["index.html"]).toContain('id="menuBtn"');
    expect(pages["contact.html"]).toContain('id="bookForm"');
    expect(pages["contact.html"]).toContain("tel:");
    expect(pages["reviews.html"]).toContain("<details>");
    expect(pages["contact.html"]).toContain("wa.me");
  });
  it("applies the theme and sanitizes bad input", () => {
    const themed = renderDemoSite(fb, { accent: "#ff0000", headingFont: "sans", bodyFont: "serif", baseSize: 18, radius: 0 });
    expect(themed["index.html"]).toContain("--accent:#ff0000");
    expect(themed["index.html"]).toContain("font-size:18px");
    const bad = renderDemoSite(fb, { accent: "not-a-color", headingFont: "sans", bodyFont: "sans", baseSize: 99, radius: 99 });
    expect(bad["index.html"]).toContain("--accent:#0C3B38");
    expect(sanitizeTheme({}).accent).toBe("#0C3B38");
  });
  it("tooth medic preset uses only real facts", () => {
    const c = toothMedicSiteContent();
    expect(c.business).toBe("Tooth Medic Family Dental Care");
    expect(c.phone).toBe("+91 70752 29333");
    expect(c.services.map((s) => s.name)).toContain("Invisalign");
    expect(c.services.every((s) => s.price === "")).toBe(true);
    expect(c.testimonials).toEqual([]);
    const blob = JSON.stringify(c).toLowerCase();
    expect(blob).not.toContain("years of experience");
    expect(blob).not.toContain("award");
  });
});
