import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { consumeAiRateLimit, listAiGenerations, recordAiGeneration, recordEmailDelivery } from "./db";

const appProcedure = ENV.isProduction ? protectedProcedure : publicProcedure;
const PROMPT_VERSION = "v1";

const leadInput = z.object({
  id: z.string().max(120).optional(),
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
  ].join("\n");
  if (kind === "outreach") return `Write one ready-to-send first-contact outreach message for the business below. The sender is a small web studio based in Hyderabad, India. Do not invent a person’s name, pricing, awards, or claims about the business. Be specific, human, and low-pressure. Tone: ${tone}. Return only the message body, with no subject line and no markdown.\n\n${context}`;
  if (kind === "audit") return `Create a concise, practical website/digital presence audit for the business below. The audit will be shown to the studio owner before it is shared. Mention what can be inferred from the available context, clearly label assumptions, and give 3 prioritized improvements with a reason for each. Tone: ${tone}. Use short headings and bullets. Do not invent facts.\n\n${context}`;
  return `Draft a client-ready proposal outline for the business below, for a Hyderabad web studio. Include objective, recommended scope, deliverables, timeline assumptions, next step, and a clearly marked placeholder for INR pricing. Do not invent a contact name, exact requirements, or guaranteed results. Tone: ${tone}. Use concise headings.\n\n${context}`;
}

function textFromResponse(content: string | Array<{ type: string; text?: string }> | null | undefined) {
  if (!content) return "";
  return typeof content === "string" ? content.trim() : content.map((part) => part.text || "").join("\n").trim();
}

async function sendThroughProvider(to: string, subject: string, body: string) {
  if (!ENV.emailFrom) throw new Error("EMAIL_FROM is not configured");
  const provider = ENV.emailProvider === "sendgrid" ? "sendgrid" : "resend";
  if (provider === "resend") {
    if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY is not configured");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: ENV.emailFrom, to: [to], subject, text: body }),
    });
    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok) throw new Error(payload.message || `Resend returned ${response.status}`);
    return { provider, id: payload.id };
  }
  if (!ENV.sendgridApiKey) throw new Error("SENDGRID_API_KEY is not configured");
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.sendgridApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: ENV.emailFrom }, subject, content: [{ type: "text/plain", value: body }] }),
  });
  if (!response.ok) throw new Error(`SendGrid returned ${response.status}: ${await response.text()}`);
  return { provider, id: response.headers.get("x-message-id") || undefined };
}

export const appRouter = router({
  system: systemRouter,
  leads: router({
    verifyWebsite: publicProcedure.input(z.object({ url: z.string().url() })).mutation(async ({ input }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        let response = await fetch(input.url, { method: "HEAD", redirect: "follow", signal: controller.signal });
        if (!response.ok || response.status === 405) {
          response = await fetch(input.url, { method: "GET", redirect: "follow", signal: controller.signal });
        }
        const reachable = response.ok;
        return { status: reachable ? "functional" as const : "unreachable" as const, httpStatus: response.status, confidence: reachable ? 99 : 82 };
      } catch {
        return { status: "unknown" as const, httpStatus: null, confidence: 55 };
      } finally {
        clearTimeout(timeout);
      }
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ai: router({
    generate: appProcedure.input(z.object({ kind: kindInput, tone: toneInput, lead: leadInput })).mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? 0;
      const limit = Number.isFinite(ENV.aiHourlyLimit) && ENV.aiHourlyLimit > 0 ? ENV.aiHourlyLimit : 50;
      const usage = await consumeAiRateLimit(String(userId), limit);
      const prompt = buildPrompt(input.kind, input.tone, input.lead);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are Jarvis, a careful sales-operations writing assistant for an Indian web studio. Never fabricate business facts. If context is missing, use a clearly marked placeholder or say that it needs verification." },
            { role: "user", content: prompt },
          ],
          max_tokens: input.kind === "audit" || input.kind === "proposal" ? 900 : 500,
        });
        const text = textFromResponse(response.choices?.[0]?.message?.content);
        if (!text) throw new Error("The AI provider returned an empty response");
        await recordAiGeneration({ userId, leadId: input.lead.id, businessName: input.lead.business, kind: input.kind, tone: input.tone, promptVersion: PROMPT_VERSION, prompt, output: text, model: response.model });
        return { kind: input.kind, tone: input.tone, text, model: response.model, usage: { count: usage.count, limit: usage.limit, resetAt: usage.resetAt } };
      } catch (error) {
        throw error instanceof Error ? error : new Error("AI generation failed");
      }
    }),
    history: appProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) })).query(({ ctx, input }) => listAiGenerations(ctx.user?.id ?? 0, input.limit)),
  }),
  email: router({
    send: appProcedure.input(z.object({ leadId: z.string().max(120).optional(), to: z.string().email(), subject: z.string().min(1).max(500), body: z.string().min(1).max(50000) })).mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? 0;
      const provider = ENV.emailProvider === "sendgrid" ? "sendgrid" : "resend";
      try {
        const result = await sendThroughProvider(input.to, input.subject, input.body);
        await recordEmailDelivery({ userId, leadId: input.leadId, recipient: input.to, subject: input.subject, provider: result.provider, status: "sent", providerMessageId: result.id, sentAt: new Date() });
        return { success: true as const, provider: result.provider, id: result.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Email send failed";
        await recordEmailDelivery({ userId, leadId: input.leadId, recipient: input.to, subject: input.subject, provider, status: "failed", error: message });
        throw new Error(message);
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
