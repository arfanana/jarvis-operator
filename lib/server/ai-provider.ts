import { demoContentPrompt } from "@/lib/demo-sites";
export type AIProviderId = "openrouter" | "openai" | "deepseek" | "custom";

export interface AIConfig {
  provider: AIProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function aiConfigFromEnv(): { config: AIConfig | null; error?: string } {
  const provider = (process.env.AI_PROVIDER ?? "openrouter").toLowerCase() as AIProviderId;
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
  const model = process.env.AI_MODEL ?? "openai/gpt-4o-mini";
  const baseUrl =
    process.env.AI_BASE_URL ??
    (provider === "openai" ? "https://api.openai.com/v1" : provider === "deepseek" ? "https://api.deepseek.com/v1" : provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://openrouter.ai/api/v1");
  if (!apiKey) return { config: null, error: "AI is not configured. Set AI_PROVIDER, AI_BASE_URL, AI_API_KEY and AI_MODEL on the server." };
  return { config: { provider, baseUrl, apiKey, model } };
}

export async function chatCompletion(opts: {
  config: AIConfig;
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; model: string; provider: string }> {
  const res = await fetch(`${opts.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.config.apiKey}`,
      ...(opts.config.provider === "openrouter" ? { "HTTP-Referer": "https://jarvis-operator.local", "X-Title": "Jarvis Operator" } : {}),
    },
    body: JSON.stringify({
      model: opts.config.model,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 800,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI provider error (${res.status}): ${t.slice(0, 300)}`);
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = j.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("AI provider returned an empty response.");
  return { text, model: opts.config.model, provider: opts.config.provider };
}

const KNOWN_FACTS_GUARD =
  "Rules: use ONLY the business facts provided. Never invent phone numbers, addresses, ratings, prices or guarantees. Clearly label sections as [Known facts] vs [Assumptions — verify]. If data is missing, say so instead of guessing.";

export function buildPrompt(op: string, lead: Record<string, unknown>, extra?: Record<string, unknown>): { system: string; user: string } {
  if (op === "demo") {
    // Structured JSON content (never raw HTML) — parsed + sanitized by lib/demo-sites.
    const category = String(extra?.category ?? lead.category ?? "local business");
    return {
      system: "You are a copywriter for small local businesses. Output STRICT JSON only. Plain words, no hype, no emojis, no exclamation marks.",
      user: demoContentPrompt(lead, category),
    };
  }
  const facts = `Business: ${lead.name ?? "—"} | Category: ${lead.category ?? "—"} | City: ${lead.city ?? "—"}, ${lead.region ?? ""} | Phone: ${lead.phone ?? "unknown"} | Email: ${lead.email ?? "unknown"} | Website: ${lead.website ?? "none"} (${(lead as Record<string, unknown>).website_status ?? "unknown"}) | Rating: ${lead.rating ?? "unknown"} | Reviews: ${lead.reviewCount ?? "unknown"} | Score: ${lead.score ?? "—"}/100.`;
  const tone = (extra?.tone as string) ?? "direct, professional";
  const lang = (extra?.language as string) ?? "English";
  const base = `Tone: ${tone}. Language: ${lang}. ${KNOWN_FACTS_GUARD}`;
  const map: Record<string, string> = {
    audit: `Write a client-facing website audit summary from this measured data: ${JSON.stringify(extra?.audit ?? {})}. Structure: verdict, top 3 fixes, expected impact.`,
    enrich: `List 5 enrichment bullets: demand signals, digital gap, best channel, deal band, next action.`,
    outreach: `Draft a first-contact ${extra?.channel ?? "email"} (subject + body) for this business.`,
    proposal: `Draft a short proposal outline (scope, timeline, price band, CTA). Price band: ₹${Math.round(Number(lead.deal_value ?? 4500) * 0.7)}–₹${Math.round(Number(lead.deal_value ?? 4500) * 1.3)}.`,
    followup: `Draft a polite follow-up #1 referencing the first message, with one proof point.`,
    summarize: `Summarize this lead in 5 bullets + recommended next action with reason.`,
    next_action: `Recommend exactly one next action (call/email/whatsapp/visit) with timing and a one-line script.`,
  };
  return { system: `You are Jarvis, a sales-operations assistant. ${base}`, user: `${map[op] ?? map.summarize}\n\nFacts: ${facts}` };
}
