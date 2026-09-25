import { describe, expect, it } from "vitest";
import { toDbLead } from "@/lib/server/lead-map";

const CLIENT_LEAD = {
  id: "c123",
  name: "Partha Dental Clinic",
  category: "Dental",
  city: "Kondapur",
  phone: "+91 1",
  website: "https://x.example",
  website_status: "unknown",
  score: 55,
  conversion_probability: 0.55,
  status: "new",
  assigned_to: "u2",
  created_at: "2026-09-25T00:00:00.000Z",
  deal_value: 49500,
  next_follow_up: "2026-09-25",
  nextFollowUp: "2026-09-26",
  reviewCount: 12,
  source: "places",
};

describe("toDbLead", () => {
  it("drops client-only keys that PostgREST would reject", () => {
    const row = toDbLead(CLIENT_LEAD);
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("assigned_to");
    expect(row).not.toHaveProperty("conversion_probability");
    expect(row).not.toHaveProperty("nextFollowUp");
    expect(row).not.toHaveProperty("reviewCount");
    expect(row).not.toHaveProperty("created_at");
  });
  it("maps renamed columns and probability scale", () => {
    const row = toDbLead(CLIENT_LEAD);
    expect(row.review_count).toBe(12);
    expect(row.next_follow_up).toBe("2026-09-26");
    expect(row.probability).toBe(55);
    expect(row.name).toBe("Partha Dental Clinic");
    expect(row.source).toBe("places");
  });
  it("keeps real columns intact", () => {
    const row = toDbLead({ name: "X", status: "proposal_sent", website_status: "unknown", score: 80 });
    expect(row.status).toBe("proposal_sent");
    expect(row.opportunity_score).toBe(80);
  });
});
