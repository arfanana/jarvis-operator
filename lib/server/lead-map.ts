// Client Lead → DB row mapping. The client shape carries UI-only keys
// (assigned_to, conversion_probability) that must never reach PostgREST,
// or every write fails with an unknown-column error.
const DROP = new Set(["id", "assigned_to", "conversion_probability", "probability", "score_breakdown", "created_at"]);

export function toDbLead(input: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || DROP.has(k)) continue;
    if (k === "reviewCount") row["review_count"] = v;
    else if (k === "nextFollowUp") row["next_follow_up"] = v;
    else row[k] = v;
  }
  // probability column is an int 0–100; client carries a 0–1 float.
  const cp = input.conversion_probability;
  if (typeof cp === "number" && Number.isFinite(cp)) {
    row["probability"] = Math.max(0, Math.min(100, Math.round(cp * 100)));
  } else if (typeof input.probability === "number" && Number.isFinite(input.probability)) {
    const p = input.probability as number;
    row["probability"] = p <= 1 ? Math.round(p * 100) : Math.round(p);
  }
  if (typeof input.score === "number" && row["opportunity_score"] === undefined) {
    row["opportunity_score"] = Math.max(0, Math.min(100, Math.round(input.score)));
  }
  return row;
}
