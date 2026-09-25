import { describe, expect, it } from "vitest";
import { bboxAround, DemoBusinessProvider, distanceKm, geoCategoriesFor, splitBoxes, tagsForQuery } from "@/lib/server/business-search";
import { profileDisplayName, profileInitials } from "@/lib/profile";

describe("osm tag mapping", () => {
  it("maps common business types", () => {
    expect(tagsForQuery("dental clinics")).toContain("healthcare=dentist");
    expect(tagsForQuery("gym")).toContain("leisure=fitness_centre");
    expect(tagsForQuery("salon")).toContain("shop=beauty");
    expect(tagsForQuery("restaurant")).toContain("amenity=restaurant");
    expect(tagsForQuery("hotel")).toContain("tourism=hotel");
  });
  it("returns empty for unknown types (name fallback)", () => {
    expect(tagsForQuery("quantum harmonizer repair")).toEqual([]);
  });
});

describe("bbox math", () => {
  it("grows with radius and stays ordered", () => {
    const small = bboxAround(17.49, 78.39, 2);
    const big = bboxAround(17.49, 78.39, 10);
    expect(small[0]).toBeGreaterThan(big[0]);
    expect(small[2]).toBeLessThan(big[2]);
    expect(small[0]).toBeLessThan(small[2]);
    expect(small[1]).toBeLessThan(small[3]);
  });
  it("clamps radius", () => {
    const a = bboxAround(17.49, 78.39, 500);
    const b = bboxAround(17.49, 78.39, 25);
    expect(a).toEqual(b);
  });
  it("splits large areas into 4 quadrants covering the full box", () => {
    expect(splitBoxes(17.49, 78.39, 5)).toHaveLength(1);
    const q = splitBoxes(17.49, 78.39, 25);
    expect(q).toHaveLength(4);
    const full = bboxAround(17.49, 78.39, 25);
    const lats = q.flatMap((b) => [b[0], b[2]]);
    const lngs = q.flatMap((b) => [b[1], b[3]]);
    expect(Math.min(...lats)).toBeCloseTo(full[0], 8);
    expect(Math.max(...lats)).toBeCloseTo(full[2], 8);
    expect(Math.min(...lngs)).toBeCloseTo(full[1], 8);
    expect(Math.max(...lngs)).toBeCloseTo(full[3], 8);
  });
});

describe("demo provider variance", () => {
  it("varies names by area and count by radius", async () => {
    const p = new DemoBusinessProvider();
    const a = await p.search({ text: "dental", location: "Kukatpally", radiusKm: 5 });
    const b = await p.search({ text: "dental", location: "Gachibowli", radiusKm: 5 });
    const wide = await p.search({ text: "dental", location: "Kukatpally", radiusKm: 15 });
    expect(a.map((r) => r.name).join("|")).not.toBe(b.map((r) => r.name).join("|"));
    expect(wide.length).toBeGreaterThan(a.length);
  });
});

describe("geoapify categories", () => {
  it("maps specific then broad", () => {
    expect(geoCategoriesFor("dental")[0]).toBe("healthcare.dentist");
    expect(geoCategoriesFor("dental")).toContain("healthcare");
    expect(geoCategoriesFor("restaurant")[0]).toBe("catering.restaurant");
  });
});

describe("distance", () => {
  it("computes haversine km", () => {
    expect(distanceKm(17.49, 78.39, 17.49, 78.39)).toBe(0);
    // Kukatpally ↔ Kondapur ≈ 5–7 km
    const d = distanceKm(17.493, 78.39, 17.459, 78.373);
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(12);
  });
});

describe("profile helpers", () => {
  it("derives initials and display names", () => {
    expect(profileInitials({ name: "Arfan Shaik", role: "" }, null)).toBe("AS");
    expect(profileInitials({ name: "", role: "" }, "arfen2759@gmail.com")).toBe("AR");
    expect(profileDisplayName({ name: "", role: "" }, "arfen2759@gmail.com")).toBe("arfen2759");
    expect(profileDisplayName({ name: "", role: "" }, null)).toBe("Operator");
  });
});
