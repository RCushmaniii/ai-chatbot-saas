# Progress Report — April 2026

## Infrastructure & Reliability Sprint (April 4-5, 2026)

### Context

Following the completion of the WhatsApp Chat SDK integration and Clerk v7 upgrade, focus shifted to production hardening — monitoring, rate limiting, dependency modernization, bundle optimization, env validation, and test coverage.

### Completed

#### Sentry Error Monitoring (PR #6)
- Full Next.js Sentry integration: client, server, and edge runtime configs
- `global-error.tsx` boundary catches unhandled React errors
- `withSentryConfig` wrapper on `next.config.ts` for source map uploads
- `/monitoring` tunnel route bypasses ad blockers
- Navigation tracking via `onRouterTransitionStart`
- Env vars (`SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`) deployed to Vercel production + preview

#### Redis Rate Limiting (PR #7)
- Migrated `lib/rate-limit.ts` from in-memory to `@upstash/ratelimit` + `@upstash/redis`
- Sliding window algorithm, keyed by route + IP
- Graceful fallback to in-memory when `UPSTASH_REDIS_REST_URL` not set (dev/test)
- Updated `embed/capture` and `embed/chat` routes for async rate limiter
- Upstash Redis database provisioned (`cushlabs-chatbot-saas` on Upstash console)
- Env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) deployed to Vercel
- `.env.example` rewritten: replaced NextAuth references with Clerk, added Upstash/Sentry/WhatsApp vars

#### React 19 Stable Upgrade (PR #9)
- Upgraded `react`/`react-dom` from `19.0.0-rc` to `19.2.4` stable
- Upgraded `@types/react` to `19.2.14`, `@types/react-dom` to `19.2.3`
- Upgraded `next-themes` from `0.3.0` to `0.4.6` (React 19 peer dep fix)
- Fixed React 19 `RefObject<T | null>` type changes in `document-preview.tsx` and `toolbar.tsx`
- Fixed `next-themes` import path (`dist/types` no longer exported in 0.4.x)

#### Bundle Optimization (PR #18)
- Removed `"use client"` from 9 purely presentational components (7 playbook nodes, document-skeleton, onboarding-stepper)
- Lazy-loaded 10 admin tab content components with `next/dynamic` — only the default Knowledge tab loads eagerly
- Playbooks (React Flow), Contacts, Live Chat, Billing (Stripe), etc. now load on-demand when tab is clicked

#### Vercel Analytics + Env Validation (PR #19)
- Wired `<Analytics />` and `<SpeedInsights />` in root layout (package was installed but never rendered)
- Created `lib/env.ts` — Zod-based runtime validation of all required env vars
- Validation runs at startup via `instrumentation.ts` register hook
- Fails hard in production if required vars missing; warns in dev
- Added Sentry ingest domain to CSP `connect-src`

#### Test Coverage (PR #21)
- Added 5 new route test files (~30 test cases):
  - `admin-settings.test.ts` — CRUD, partial updates, cross-tenant isolation
  - `admin-contacts.test.ts` — create, list, search, filter, pagination, tenant isolation
  - `admin-knowledge.test.ts` — list, input validation, tenant isolation
  - `embed.test.ts` — script generation, CORS, capture/chat validation, rate limiting
  - `health.test.ts` — endpoint availability
- Test file count: 7 → 12

#### Playwright Test Fixes (PRs #3, #4, #5)
- Fixed onboarding step 4 redirect timeout (Router Cache stale data → `window.location.href`)
- Fixed flaky step 1/2 tests (hydration timing → `networkidle`, explicit visibility waits)
- Fixed sign-out test (Radix UI `pointerdown` events, viewport sizing)
- Skipped `checkMessageLimit` in test env to prevent CI 429s from accumulated usage

### Metrics

| Metric | Before | After |
|--------|--------|-------|
| Error monitoring | None | Sentry (client + server + edge) |
| Rate limiting | In-memory (single instance) | Upstash Redis (distributed) |
| React version | 19.0.0-rc | 19.2.4 stable |
| Admin bundle | All tabs eagerly loaded | 10/11 tabs lazy-loaded |
| Route test files | 2 | 7 |
| Env validation | None | Zod schema, fail-fast in prod |
| Web analytics | None | Vercel Analytics + Speed Insights |
| CI test status | Failing | Passing |

### Remaining

- Stripe webhook handler tests (mock events, subscription lifecycle)
- Knowledge ingestion E2E tests (website crawl, PDF upload)
- WhatsApp webhook E2E tests
- Media message support for WhatsApp channel
- Meta Business verification for WhatsApp production
