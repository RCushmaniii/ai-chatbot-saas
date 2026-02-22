# CLAUDE.md — Converso AI (ai-chatbot-saas)

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
- **Database:** PostgreSQL with pgvector (Drizzle ORM 0.34)
- **Auth:** Clerk (@clerk/nextjs 6.36)
- **Billing:** Stripe 20.3
- **UI:** React 19 RC, Tailwind CSS 4.1, shadcn/ui, Radix UI
- **Flow Builder:** React Flow (@xyflow/react 12.10)
- **Testing:** Playwright 1.50
- **Linting:** Biome 2.2
- **Package Manager:** pnpm 9.12

## Project Structure

```
app/
  (auth)/                   # Clerk sign-in/sign-up
  (chat)/                   # Chat UI, admin panel, chat + history APIs
  api/admin/                # 15+ admin CRUD endpoints (contacts, knowledge, playbooks, billing, etc.)
  api/embed/                # Widget embed endpoints
  api/stripe/               # Checkout + portal
  api/webhooks/stripe/      # Stripe webhook handler
  api/clerk/webhook/        # Clerk webhook handler
  api/cron/                 # Scheduled retrain + sitemap scan
components/                 # 99 components (admin-*, elements/*, ui/*)
lib/
  ai/                       # Models, prompts, providers, tools (search-knowledge.ts)
  db/                       # schema.ts, queries.ts, queries-contacts.ts, queries-playbooks.ts, etc.
  db/migrations/            # Drizzle-generated SQL migrations
  auth.ts                   # getAuthUser(), requirePermission()
  permissions.ts            # RBAC roles and permission definitions
  rate-limit.ts             # In-memory rate limiter (needs Redis migration for prod)
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

## Lessons Learned

**Read [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md) before making changes.** It contains critical build process info, common pitfalls, and solutions to problems encountered during development.

Key gotchas:
- `proxy.ts` replaces `middleware.ts` in Next.js 16 — both cannot coexist
- Rate limiter is in-memory — does NOT work across Vercel serverless instances
- `memo()` comparison functions must return `true` when props are equal (skip re-render)
- Monthly schedule calculations must use `setMonth()`, not fixed 30-day intervals

## Known Issues

- Rate limiting is in-memory (`lib/rate-limit.ts`) — needs migration to Upstash Redis for multi-instance Vercel deployment
- All ~89 components use `"use client"` directive — many static components should be server components for bundle size optimization
- No dynamic imports (`next/dynamic`) used anywhere — admin and artifact code is eagerly loaded for all users
- React 19 RC version in use (not stable release)

## Environment Setup

Required environment variables (see `.env.local`):

| Variable | Source |
|----------|--------|
| `POSTGRES_URL` | PostgreSQL connection string (needs pgvector extension) |
| `OPENAI_API_KEY` | OpenAI dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk dashboard |
| `CLERK_WEBHOOK_SECRET` | Clerk webhooks settings |
| `STRIPE_SECRET_KEY` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks settings |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL |
