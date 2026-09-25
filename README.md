# Jarvis — Sales OS (Next.js 14 App Router + TS)

Dense, dark enterprise dashboard for lead execution. Production-hardened, portable (no Manus lock-in).

## Setup
```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
```

## Commands
```bash
npm test            # vitest (28 tests: dedup, scoring, exports, SSRF, invoices, UPI, pipeline, error model, QR, rate limits, demo provider)
npm run check       # tsc --noEmit
npm run build       # next build
npm start           # serve production build
```

## Persistence modes (explicit — never silent)
| Mode | When | Behavior |
|---|---|---|
| `supabase` | `NEXT_PUBLIC_SUPABASE_URL` + anon key set | Server is truth (workspace-scoped repos + RLS). Memory cache only, zero localStorage business state. |
| `demo` | `NEXT_PUBLIC_DEMO_PERSISTENCE=true` (dev default) | Labeled local demo storage, DEMO DATA badges everywhere. |
| `unconfigured` | Production default without Supabase | Locked empty states. Writes warn and no-op. |

## Env (server-only secrets — never NEXT_PUBLIC_, never localStorage, never in client bundles)
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database + auth (public identifiers only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server writes + workspace provisioning (server-only) |
| `NEXT_PUBLIC_DEMO_PERSISTENCE` | Explicit demo-store opt-in (`true`/`false`; default true in dev, false in prod) |
| `ALLOW_DEV_AUTH` (+ `DEV_USER_ID/EMAIL`) | Honored ONLY when `NODE_ENV=development` AND `=true`. Production never bypasses. |
| `AI_PROVIDER` (`openrouter`\|`openai`\|`deepseek`\|`custom`) | AI provider adapter |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | OpenAI-compatible endpoint + model (server-only) |
| `BUSINESS_SEARCH_PROVIDER` (`auto`\|`google`\|`demo`) + `PLACES_API_KEY` | Live Google Places vs labeled demo search (server-only key) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Server-side email (server-only) |
| `NETLIFY_TOKEN` | Server-side deploys (server-only) |

## Supabase schema (run in order)
1. `supabase/schema.sql` — base tables + seed
2. `supabase/schema-02.sql` — events/notes/tags/tasks, outreach, ai_generations, audits, demos, deployments, invoices, payments, deliveries, rate_limits, settings + owner RLS
3. `supabase/schema-03.sql` — **workspaces**, workspace_members, `workspace_id`/`owner_id` on all business tables, workspace-isolated RLS

## Routes
| Route | Purpose |
|---|---|
| `/today` | Execution screen (follow-ups, hot, waiting, aging, targets) — real activity events |
| `/dashboard` | Metrics from persisted records + LIVE/DEMO/NOT-CONFIGURED badge + empty states |
| `/find-leads` | **Live server search** (Google Places when configured, else labeled DEMO DATA) + filters, pagination, bulk save, history, saved searches, **intelligence pipeline runner** |
| `/add-leads` | Manual + CSV + Paste links + Paste Maps details + duplicate detection |
| `/saved-leads` | CRM grid, real filters, CSV/JSON/PDF exports, confirmed deletes |
| `/pipeline` | Kanban (drag-drop + advance), filters, add-lead workflow, stage history |
| `/ai-tools` | 8 server AI ops, JWT-authenticated, usage persisted to `ai_generations` |
| `/outreach` | Templates + Day 0/2/5/10, server email (delivery persisted), user-controlled WhatsApp |
| `/demos` | 10 templates → AI → edit → preview → Netlify deploy (record persisted server-side) |
| `/invoices` | Full metadata, optional GST, **locally generated scannable UPI QR image** (no external API), QR embedded in print/PDF |
| `/revenue` | Pipeline → proposal → invoice → payment metrics |
| `/activity` | Persisted event timeline (PERSISTED/LOCAL badge) |
| `/website-cleanup` | Measured audit (audits persisted) + SSRF-safe verify — never auto-deletes |
| `/settings` | Account (sign out) + 5 providers (Supabase/AI/Business search/Email/Netlify) with safe test buttons |
| `/login`, `/signup`, `/reset-password` | Supabase Auth email/password + Google OAuth (when enabled in Supabase) |
| `/logs` | Real event stream (no simulated entries) |

## API (all require auth; typed `{ error: { code, message } }`, no stacks/secrets)
`POST /api/business/search` · `GET/POST /api/leads` · `PATCH/DELETE /api/leads/[id]` ·
`GET/POST /api/activity` · `POST /api/intelligence/run` (search→dedupe→score→website→audit→draft→tasks; drafts only, never auto-sends) ·
`POST /api/ai/generate` · `POST /api/website/verify|audit` · `POST /api/outreach/send` ·
`POST /api/netlify/deploy` · `POST /api/invoices/qr` · `GET /api/settings/test`
Rate limits: ai 30/m, audit 10/m, search 20/m, verify 20/m, email 30/m, deploy 10/m, intelligence 10/m, leads_write 60/m (+ Supabase `rate_limits` mirror).

## Security
- Auth: Supabase JWT (userinfo + JWKS) via header or session cookie; every mutation verifies ownership + workspace membership; RLS workspace-isolated policies.
- Website fetch: SSRF-safe (protocol/host/port/DNS/redirect/size/timeout rules).
- Opportunity Score is explainable (positives/negatives/missing) and never called a conversion probability.

## Notes
- Theme: dark dense enterprise, restrained blue accent, compact controls; light mode supported. Focus-visible rings, skip link, mobile nav, responsive tables/kanban.
