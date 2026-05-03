# Progress Log — May 2026

## 2026-05-03 — Launch Readiness Audit + Hardening (PR #29)

**Context:** Targeting public launch Friday 2026-05-08. Robert asked for a brutally honest pre-launch audit, then said "tackle them all" when blockers were identified.

### What was audited

I ran a full launch-readiness sweep: multi-tenancy isolation, auth coverage, rate limiting, webhook signatures, Stripe billing, WhatsApp integration, embed widget security, env validation, Sentry, cron routes, migrations, tests, hardcoded URLs, CI, README, pricing seed, feature flags. The substantive findings became PR #29.

### P0 blockers found (all fixed)

1. **Embed widget would not load on any customer site.** `proxy.ts` was setting `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'` on every response, including `/embed/chat`. Cross-origin iframes from customer domains would have been refused by every browser. **Plus** `next.config.ts` was independently setting `X-Frame-Options: DENY` on all routes, which would have undermined any proxy-level fix. Both files corrected; embeddable routes now skip both headers.

2. **Cross-tenant knowledge-base leak in embed widget.** `app/api/embed/chat/route.ts:180` called `searchKnowledgeDirect(message)` with no `businessId`. The function then fell through to a legacy `Document_Knowledge` query with a `1=1` filter — returning any business's content to any caller. **Same bug existed in the authenticated chat route** (`app/(chat)/api/chat/route.ts:174`) but was caught at the same time. `searchKnowledgeDirect` now requires a valid UUID `businessId`, returns `[]` otherwise, and the legacy fallback is also tenant-scoped (no more `business_id IS NULL` rows leaking).

3. **SQL injection in `lib/ai/tools/search-knowledge.ts`.** Was using `client.unsafe()` with `${businessId}` and `${botId}` interpolated directly. The embed widget supplies `businessId` from the request body — exploitable. All queries now parameterized via postgres.js tagged templates with UUID validation as defense in depth.

4. **`CRON_SECRET` was not set in Vercel + no `vercel.json`.** Both `/api/cron/*` routes verify a `Bearer <CRON_SECRET>` header and fail closed. Without the env var AND without `vercel.json` cron config, monthly retraining and sitemap scans simply weren't running. Added `CRON_SECRET` (separate random value per environment, generated cleanly to avoid trailing-newline whitespace) and `vercel.json` with daily schedules.

5. **CRITICAL Clerk auth-bypass vulnerability** (caught during the post-PR vuln sweep, not the original audit). Our pinned `@clerk/nextjs` 7.0.8 was vulnerable to GHSA-vqx2-fgx2-5wq9 — a middleware-based route protection bypass. Bumped to 7.3.0. Same vuln was also reaching us via `@clerk/localizations 4.3.0 → @clerk/shared 4.4.0`, fixed by bumping localizations to latest.

### P1 hardening shipped

- **Sentry sample rates**: 1.0 → 0.1 in production (server, edge, client). Replays 0.1 → 0.05.
- **WhatsApp feature flag** (`NEXT_PUBLIC_WHATSAPP_ENABLED`, default off): hides admin tab + 503s the API + webhook routes. Integration is half-shipped (no Meta verification, no E2E tests) and was previously visible to paying customers.
- **Public endpoint rate limiting**: `/api/plans` (60/min/IP), `/api/onboarding/complete` (10/min/IP), `/api/onboarding/progress` (30/min/IP).
- **Origin tracking on embed chat**: capture `Origin`/`Referer` into `WidgetConversation.metadata.origin` for post-hoc abuse tracing.

### Second-pass hardening (after Robert provided the Messenger-bot architecture review for comparison)

- **`lib/ai/safety/input-guard.ts`** — 30+ prompt-injection patterns (English + Spanish): DAN/jailbreak, role override, "ignore previous instructions", system marker spoofing, mode-switch attacks. Wired into both chat routes.
- **`lib/ai/safety/output-guard.ts`** — sentinel detection for system-prompt leakage (RAG block headers, prompt section markers, common LLM meta-leakage like "As an AI language model"). Wired into embed chat with safe bilingual fallback.
- **`lib/ai/retry.ts`** — `withRetry` helper with exponential backoff (200/1000/3000ms, 4 attempts max). Wraps embed chat `generateText`. Authenticated `streamText` uses Vercel AI SDK's built-in `maxRetries: 3`.
- **`lib/ai/router.ts`** — `routeModel()` classifies pleasantries → `gpt-4o-mini`; knowledge questions → `gpt-4o`. Wired into embed chat.
- **Dependency vuln sweep**: removed unused langchain stack (zero source-code usages, 5+ critical/high transitive vulns). Bumped Clerk + Next.js. Total vulnerabilities: **76 → 40, 3 critical → 0**.
- **Privacy retention**: `/api/cron/purge-old-messages` daily, deletes `WidgetMessage` bodies older than 90 days. Conversations rows kept for attribution; raw chat content expires.
- **Sentry source maps**: `sourcemaps.disable: false` + `widenClientFileUpload: true` so production stack traces map to TS line numbers, not minified JS.

### Cleanup folded in

- `PORTFOLIO.md`: removed duplicate `health_status:` block + tagline tweak.
- `app/global-error.tsx`: dropped `import type Error from "next/error"` (was shadowing global `Error`).
- `tests/routes/embed.test.ts`: removed unused `has429` capture.
- Auto-formatter pass cleaned up several pre-existing format violations across the repo (`next.config.ts`, `lib/rate-limit.ts`, etc.).
- `next.config.ts`: removed duplicate security headers (`X-Frame-Options: DENY`, HSTS, etc.) so `proxy.ts` is the single source of truth.

### What was explicitly deferred

- **Stripe live mode switch + plan re-seeding**: requires Robert in the Stripe dashboard. Cannot be done from CLI safely.
- **Visitor-ID hashing in `WidgetConversation`**: schema migration + lookup-path coupling. Belongs in its own focused PR after launch.
- **Pure-function unit tests** for `lib/permissions.ts`, `lib/playbook/engine.ts`, `lib/utils/language-detector.ts`: the Messenger-bot review highlighted the Vitest gap; post-launch project.
- **Anthropic + prompt caching evaluation**: the Messenger bot's economics on prompt-cached system prompts (~80% cost reduction on hits) are real, but switching providers 5 days before launch is the wrong move. Add to v1.1 evaluation.

### CI status

- Lint: clean (was 8 errors + 1 warning on `main` for ~1 month before this PR; now zero).
- Build: clean.
- `pnpm audit --prod`: 0 critical, 14 high, 24 moderate, 2 low (was 3 / 27 / 42 / 4).
- Playwright: 4 pre-existing failures from `main` carry through (CI environment issues — missing OpenAI embedding model access, env validation. Confirmed by checking April 2026 `main` runs.). Not blockers for production code correctness.

### Files

- 11 + 25 = 36 files changed across both commits.
- 5 new files: `lib/features.ts`, `lib/ai/retry.ts`, `lib/ai/router.ts`, `lib/ai/safety/input-guard.ts`, `lib/ai/safety/output-guard.ts`.
- 2 new routes: `app/api/cron/purge-old-messages/route.ts`, `vercel.json` (cron config).
- Net `+854 / −1715` lines (langchain removal accounts for the deletion bulk).

### Outstanding launch-week checklist

| Item | Owner | Due |
|---|---|---|
| Switch Stripe to live mode + re-seed plans | Robert | by Wed 2026-05-06 |
| End-to-end smoke test in Vercel Preview (signup → embed → cron → Sentry) | Robert | Thu 2026-05-07 |
| Watch Sentry + Vercel logs first hour after launch | Robert | Fri 2026-05-08 |

### Outstanding post-launch follow-ups

- Visitor-ID hashing PR (privacy)
- Pure-function unit test coverage (`lib/permissions.ts`, `lib/playbook/engine.ts`, `lib/utils/language-detector.ts`)
- Anthropic + prompt caching cost-modeling evaluation
- Per-business origin allowlist for embed widget (schema change)
- Output guard on streaming `streamText` in authenticated chat (currently only on embed `generateText`)
- ~14 remaining HIGH-severity dependency vulns to triage
