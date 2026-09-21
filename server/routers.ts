import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const leadInput = z.object({
  business: z.string().min(1).max(200),
  niche: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
  website: z.string().max(500).optional(),
  score: z.number().min(0).max(100).optional(),
  probability: z.number().min(0).max(100).optional(),
  stage: z.string().max(40).optional(),
});

const toneInput = z.enum(["Formal", "Casual", "Short", "Long", "Hindi", "Telugu"]);
const kindInput = z.enum(["outreach", "audit", "proposal"]);

function buildPrompt(kind: z.infer<typeof kindInput>, tone: z.infer<typeof toneInput>, lead: z.infer<typeof leadInput>) {
  const context = [
    `Business: ${lead.business}`,
    `Category: ${lead.niche || "unknown"}`,
    `Location: ${lead.location || "Hyderabad, Telangana"}`,
    `Website: ${lead.website || "not provided"}`,
    `Lead score: ${lead.score ?? "not scored"}/100`,
    `Estimated conversion probability: ${lead.probability ?? "not scored"}%`,
    `Pipeline stage: ${lead.stage || "New"}`,
  ].join("\\n");
  if (kind === "outreach") return `Write one ready-to-send first-contact outreach message for the business below. The sender is a small web studio based in Hyderabad, India. Do not invent a person’s name, pricing, awards, or claims about the business. Be specific, human, and low-pressure. Tone: ${tone}. Return only the message body, with no subject line and no markdown.\n\n${context}`;
  if (kind === "audit") return `Create a concise, practical website/digital presence audit for the business below. The audit will be shown to the studio owner before it is shared. Mention what can be inferred from the available context, clearly label assumptions, and give 3 prioritized improvements with a reason for each. Tone: ${tone}. Use short headings and bullets. Do not invent facts.\n\n${context}`;
  return `Draft a client-ready proposal outline for the business below, for a Hyderabad web studio. Include objective, recommended scope, deliverables, timeline assumptions, next step, and a clearly marked placeholder for INR pricing. Do not invent a contact name, exact requirements, or guaranteed results. Tone: ${tone}. Use concise headings.\n\n${context}`;
}

function textFromResponse(content: string | Array<{ type: string; text?: string }> | null | undefined) {
  if (!content) return "";
  return typeof content === "string" ? content.trim() : content.map((part) => part.text || "").join("\n").trim();
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ai: router({
    generate: publicProcedure
      .input(z.object({ kind: kindInput, tone: toneInput, lead: leadInput }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are Jarvis, a careful sales-operations writing assistant for an Indian web studio. Never fabricate business facts. If context is missing, use a clearly marked placeholder or say that it needs verification." },
            { role: "user", content: buildPrompt(input.kind, input.tone, input.lead) },
          ],
          max_tokens: input.kind === "audit" || input.kind === "proposal" ? 900 : 500,
        });
        const text = textFromResponse(response.choices?.[0]?.message?.content);
        if (!text) throw new Error("The AI provider returned an empty response");
        return { kind: input.kind, tone: input.tone, text, model: response.model };
      }),
  }),
});

export type AppRouter = typeof appRouter;
