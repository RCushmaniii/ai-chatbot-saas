# CLAUDE.md — Converso AI (ai-chatbot-saas)

## Why this matters before you change anything

Self-serve website assistant with its own billing and tenant onboarding.

**If this breaks:** Sign-ups fail or tenants get each other's configuration. Because it is self-serve, a fault reaches a paying customer before anyone here notices.

Its risk class and revenue proximity are recorded in `operating-system/portfolio/repo-metadata.json`, and are read from there rather than restated here -- the same rule that governs prices, client facts and platform approvals.
## Project Overview

Multi-tenant AI chatbot SaaS built with Next.js 16. Service businesses deploy bilingual (EN/ES) AI assistants backed by their own knowledge base. Includes admin dashboard, visual playbook builder, lead management, live chat handoff, Stripe billing, and an embeddable widget. Deployed on Vercel.

## User Role

The user is an IT Project Manager, NOT a developer. Never ask the user to:

- Write or modify code
- Run development commands
- Test functionality manually
- Do any development work

If Claude cannot complete a task (e.g., needs a CLI tool installed, needs a package downloaded, needs external access), ask the user for help with that specific blocker — but never delegate the development work itself.

## Tech Stack

- **Framework:** Next.js 16.1.4 (App Router, Turbopack)
- **Language:** TypeScript 5.6
- **AI:** Vercel AI SDK 5.0, OpenAI GPT-4o, text-embedding-3-small
- **Database:** PostgreSQL with pgvector (Drizzle ORM 0.45)
- **Auth:** Clerk (@clerk/nextjs 7.3)
- **Billing:** Stripe 20.3
- **UI:** React 19.2, Tailwind CSS 4.1, shadcn/ui, Radix UI
- **Flow Builder:** React Flow (@xyflow/react 12.10)
- **Testing:** Playwright 1.50
- **Linting:** Biome 2.2
- **Package Manager:** pnpm 10.28 (pinned in `package.json#packageManager`; dependency floors live in `pnpm-workspace.yaml`, not `package.json#pnpm`)

## Project Structure

```
app/
  (auth)/                   # Clerk sign-in/sign-up
  (chat)/                   # Chat UI, admin panel, chat + history APIs
  api/admin/                # 15+ admin CRUD endpoints (contacts, knowledge, playbooks, billing, etc.)
  api/embed/                # Widget embed endpoints
  api/stripe/               # Checkout + portal
  api/webhooks/stripe/      # Stripe webhook handler
  api/webhooks/[platform]/  # Chat SDK webhook handler (WhatsApp, Slack, etc.)
  api/clerk/webhook/        # Clerk webhook handler
  api/cron/                 # Scheduled retrain + sitemap scan
components/                 # 99 components (admin-*, elements/*, ui/*)
lib/
  ai/                       # Models, prompts, providers, tools (search-knowledge.ts)
  channels/                  # Multi-channel bot (Chat SDK): bot.ts, whatsapp-handler.ts
  db/                       # schema.ts, queries.ts, queries-contacts.ts, queries-playbooks.ts, etc.
  db/migrations/            # Drizzle-generated SQL migrations
  auth.ts                   # getAuthUser(), requirePermission()
  permissions.ts            # RBAC roles and permission definitions
  rate-limit.ts             # Postgres-backed sliding-window rate limiter (shared state across serverless instances)
  stripe.ts                 # Stripe client setup
hooks/                      # 6 custom React hooks
scripts/                    # Seed, ingest, and maintenance scripts
migrations/                 # Custom SQL migrations (indexes, schema fixes)
```

## Development Commands

```powershell
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (Turbopack)
pnpm build                # Production build
pnpm build:migrate        # Run migrations then build (Vercel build command)
pnpm db:migrate           # Apply Drizzle migrations
pnpm db:push              # Push schema changes to database
pnpm db:generate          # Generate new migration from schema changes
pnpm db:studio            # Open Drizzle Studio (DB browser)
pnpm seed:plans           # Seed Stripe pricing plans
pnpm test                 # Run Playwright E2E tests
pnpm lint                 # Lint with ultracite/biome
pnpm format               # Auto-format with ultracite/biome
```

## Key Patterns and Conventions

- **Next.js 16 uses `proxy.ts`** instead of `middleware.ts` — both cannot coexist
- **Multi-tenancy:** every DB query MUST filter by `businessId` for tenant isolation
- **Auth pattern:** `const { user, error } = await requirePermission("permission:name")` at the top of every admin route
- **RBAC:** Roles defined in `lib/permissions.ts` — owner, admin, member
- **Validation:** Zod schemas for all API request bodies
- **Database:** Drizzle ORM with typed queries. Raw SQL via `postgres` template literals when needed (e.g., pgvector similarity search)
- **Knowledge search:** `lib/ai/tools/search-knowledge.ts` — generates embeddings, searches KnowledgeChunk + Document_Knowledge with cosine similarity
- **Naming:** Components use PascalCase files, lib modules use kebab-case, API routes use `route.ts`

## Proactive Product Advisor

Don't just implement what's asked — think like a product designer:

- Simplify UX: if a feature adds complexity users don't need, suggest removing it
- "It Just Works": modern apps don't ask users to configure things that should be automatic
- Challenge requirements: if something seems over-engineered, say so and propose simpler alternatives
- Think like a user: would a non-technical business owner understand this UI?

## Active Initiatives

- **WhatsApp / Chat SDK Integration** — Adding multi-channel support via Vercel Chat SDK, starting with WhatsApp. Strategic differentiator for Mexico market. Progress tracked in [`docs/WHATSAPP_INTEGRATION_LOG.md`](docs/WHATSAPP_INTEGRATION_LOG.md). Branch: `feat/whatsapp-chat-sdk`.

## Lessons Learned

**Read [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md) before making changes.** It contains critical build process info, common pitfalls, and solutions to problems encountered during development.

Key gotchas:

- `proxy.ts` replaces `middleware.ts` in Next.js 16 — both cannot coexist
- Rate limiter uses Postgres sliding window (`lib/rate-limit.ts`) — shared state across all Vercel serverless instances, no Redis/Upstash required
- `memo()` comparison functions must return `true` when props are equal (skip re-render)
- Monthly schedule calculations must use `setMonth()`, not fixed 30-day intervals

## Website widget rules (audit of 2026-10-14)

Each rule below is a production bug found here or on ny-ai-chatbot. Break one and the bug comes back.

**What visitors see**

- **A save is not done until a visitor sees it.** The chain is: admin (`components/admin-widget-appearance.tsx`, `components/admin-starter-questions.tsx`) → `POST /api/admin/settings` (validated by `lib/embed/settings-schema.ts`) → `bot_settings.embedSettings` / `starterQuestions` → `GET /api/embed/settings` (CDN cache 30 s + 30 s stale) → the loader (`lib/embed/script.ts`, served by `/api/embed`) and the chat window (`app/embed/chat/page.tsx`). Verify a change against the live public endpoint, not the code.
- **Saved settings win, then legacy script-tag attributes, then built-in defaults.** The install code is the bare script tag. Never add appearance or text attributes to an install, demo page or doc: `tests/unit/embed-install-attributes.test.ts` fails if you do.
- **Every visitor-facing text exists in English and Spanish** (`lib/embed/widget-text.ts`). Each language falls back to its own built-in text, never to the other language. Saved text with no language counts as English only. Spanish is Mexican Professional Spanish (es-MX), `tú` for CushLabs.
- **The widget's language comes from** `data-language`, then `language`, then the page's `<html lang>`, and the chat reloads when the page switches language.
- **The admin preview and the live widget render the same components** (`components/widget/widget-chrome.tsx`). Change the header or welcome there, never in one place only.
- **Defaults are today's look** (`lib/embed/appearance.ts`): white header, pale blue circle, no ring, standard icon. A new appearance option must default to what visitors already see.

**Hostile values**

- Anything that reaches a customer's page is hostile until checked: colors are hex only (`#abc`/`#aabbcc`), images only from our own Vercel Blob store over https (store `converso-widget-avatars`), checked on save AND in the browser (`lib/embed/sanitize.ts` holds the TypeScript and browser copies; a parity test keeps them equal). Build DOM elements, never HTML strings. Uploads are typed by their bytes; SVG is refused.
- Nothing from a request is pasted into the served script. Each deployment serves one business (`DEFAULT_BUSINESS_ID`); a request naming another gets a 403 (`lib/embed/tenant.ts`).

**What the bot says**

- Any change to the tenant's instructions, the knowledge, `lib/ai/**`, `lib/embed/**` or `app/api/embed/**` goes through the QA gate routine in `docs/QA_GATE.md`: production baseline, change, local `--compare`, read every changed reply, merge, then `pnpm qa-gate` on production must exit 0. The tenant's instructions live in the production database (`bot_settings.customInstructions`): back them up before editing.
- The gate needs `QA_GATE_TOKEN`, `DEFAULT_BUSINESS_ID` and `DEFAULT_BOT_ID` in the local env file. Local runs use the PRODUCTION database. There are no preview deployments (`vercel.json` VERCEL_ENV guard; never remove it), so pre-merge checks run on the local dev server.

**Privacy**

- Retention is code plus a public promise: `app/api/cron/purge-old-messages/route.ts` (messages 90 days, conversation page/visitor ids 90 days idle, rate-limit IP rows 1 day) and `/privacy` (`app/privacy/page.tsx`). Change both together. A new third-party service that touches visitor data, or turning on WhatsApp, means a new line on `/privacy` in the same change.

**Working rules**

- After every deploy: check the live site and the Vercel runtime errors before calling it done.
- Stop the local dev server by its port (`Get-NetTCPConnection -LocalPort 3000`), never by killing every `node.exe`.
- After an admin change ships, an admin tab that was already open shows the old screen until reloaded: tell the owner to press F5.
- To drive the admin locally without touching production data: create a throwaway Neon branch, run `pnpm dev` with `POSTGRES_URL` pointed at it and `ADMIN_EMAIL=ada-test@cushlabs.ai` (the local Clerk keys are a test instance), sign in with `@clerk/testing`, then delete the branch.
## Known Issues

- All ~89 components use `"use client"` directive — many static components should be server components for bundle size optimization
- No dynamic imports (`next/dynamic`) used anywhere — admin and artifact code is eagerly loaded for all users
- Vercel AI SDK is on v5 with `@ai-sdk/*` packages still on v2; v3 of the providers (and `ai` v6) is available and would be a meaningful upgrade but requires a coordinated cross-package bump + smoke test — see closed PR #15

## Environment Setup

Required environment variables (see `.env.local`):

| Variable                             | Source                                                  |
| ------------------------------------ | ------------------------------------------------------- |
| `POSTGRES_URL`                       | PostgreSQL connection string (needs pgvector extension) |
| `OPENAI_API_KEY`                     | OpenAI dashboard                                        |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Clerk dashboard                                         |
| `CLERK_SECRET_KEY`                   | Clerk dashboard                                         |
| `CLERK_WEBHOOK_SECRET`               | Clerk webhooks settings                                 |
| `STRIPE_SECRET_KEY`                  | Stripe dashboard                                        |
| `STRIPE_WEBHOOK_SECRET`              | Stripe webhooks settings                                |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard                                        |
| `NEXT_PUBLIC_APP_URL`                | Your deployment URL                                     |
| `WHATSAPP_ACCESS_TOKEN`              | Meta Graph API system user token                        |
| `WHATSAPP_APP_SECRET`                | Meta app secret (webhook signature verification)        |
| `WHATSAPP_PHONE_NUMBER_ID`           | WhatsApp Business phone number ID                       |
| `WHATSAPP_VERIFY_TOKEN`              | Arbitrary string for webhook challenge-response         |

## Session Log

A running log of all working sessions is maintained at `docs/SESSION_LOG.md`.
Always append a new entry at the top of this file before closing a session.
Use the `session-logger` skill to generate the entry.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
