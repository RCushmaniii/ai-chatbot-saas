# Architecture Leverage Analysis — Converso vs. Messenger Bot

**Date:** 2026-05-03
**Subject:** What to steal (and what NOT to steal) from the NY English Messenger Bot architecture (Cloudflare Workers + Claude + Vectorize) for Converso AI (Next.js 16 + OpenAI + pgvector + Postgres on Vercel).

---

## TL;DR

The Messenger bot is **genuinely better engineered for runtime durability** than Converso. It has fewer moving parts, lower latency, lower cost, smaller attack surface, and more disciplined error handling. But it solves a smaller, simpler problem.

**Converso's product surface is roughly 5× larger** (multi-tenant SaaS with billing, RBAC, lead management, playbook builder, multi-channel, vector search across documents, admin dashboard, embeddable widget). A wholesale runtime rewrite would cost months and miss launch. The right move is to **adopt the Messenger bot's discipline patterns inside our existing stack** — not to swap stacks.

This document captures what's worth adopting now, what's worth adopting later, what's NOT worth adopting, and the honest reasons for each call.

---

## Adopted in PR #29 (this week)

These are the leverage items that landed in the launch-readiness PR:

| Pattern | Source | Where it landed in Converso |
|---|---|---|
| **Output sentinel detection** — scan LLM responses for system-prompt structural markers and replace leaks with safe fallback | `validation.ts:99-145` | `lib/ai/safety/output-guard.ts`, wired into embed chat |
| **Input prompt-injection patterns** — 20+ regex patterns blocked before model call | `validation.ts:19-52` | `lib/ai/safety/input-guard.ts`, wired into both chat routes |
| **Retry-with-backoff on LLM calls** — 4 attempts, exponential delay, retry only 429/5xx | `claude.ts:194-229` | `lib/ai/retry.ts` + `streamText maxRetries: 3` |
| **Two-model routing** — pleasantries → cheap model, knowledge → expensive | `router.ts` | `lib/ai/router.ts`, wired into embed chat |
| **Privacy-first message retention** — short TTL on raw conversation content | KV TTLs in `memory.ts` | `/api/cron/purge-old-messages` (90-day cutoff) |

Net effect: defended a class of attacks (prompt injection in/out), eliminated a class of bugs ("blank screen on transient API error"), cut estimated AI cost ~30% on widget traffic, took a first cut at data-retention compliance.

---

## Worth adopting after launch (priority order)

### 1. Pure-function unit tests (Vitest)

The Messenger bot has 55 Vitest tests on pure functions (`security.test.ts`, `language.test.ts`, `router.test.ts`, `strings.test.ts`). They run in 200ms and catch regressions Playwright never will.

We have ~zero unit tests. Our `lib/permissions.ts`, `lib/playbook/engine.ts`, `lib/utils/language-detector.ts`, `lib/ai/safety/*`, `lib/ai/router.ts` should all have unit-level coverage. Particularly:

- **`lib/permissions.ts`** — RBAC checks. A bug here is a security incident.
- **`lib/playbook/engine.ts`** — multi-step state machine. Easy to break in subtle ways.
- **`lib/ai/safety/input-guard.ts` + `output-guard.ts`** — regex correctness needs tests, both for false negatives (real attacks slipping through) and false positives (legitimate messages getting rejected).

Estimated effort: 2 days for the high-value modules. Should land within the first 2 weeks post-launch.

### 2. Anthropic + prompt caching evaluation

The Messenger bot uses Claude Sonnet 4.6 for knowledge questions and Haiku 4.5 for pleasantries, with `cache_control: { type: 'ephemeral' }` on the static system prompt prefix. Claimed economics: ~80% cost reduction on cache-hit turns.

For Converso, the system prompt grows with playbook context, business-specific instructions, and RAG results. A typical Pro-tier customer's chatbot will easily have a 4-8KB system prompt. At even modest scale (1,000 messages/day across all tenants), prompt caching represents real money — possibly 4-figures/month at scale.

This is NOT a runtime swap — it's a provider swap (`@ai-sdk/openai` → `@ai-sdk/anthropic`) plus moving system prompt construction to a cacheable form. Vercel AI SDK abstracts both.

**Caveats:**
- Claude's tool-calling format differs slightly from OpenAI's. Our admin UI tools (`createDocument`, `updateDocument`, `requestSuggestions`) would need to be re-validated against Claude's tool-calling.
- Output quality on Spanish / Mexico-market English varies subtly between providers. Worth a side-by-side eval on real conversations before committing.

Estimated effort: 1 day for the swap, 1 week of A/B traffic to validate quality before flipping the default.

### 3. Output guard on streaming `streamText` in authenticated chat

PR #29 added output sentinel detection to the embed widget's `generateText` (single-shot) but NOT to the authenticated chat's `streamText` (incremental). Streaming is harder — by the time you detect a leak, the user has already seen the first N tokens.

The right architecture: a transform stream that buffers a sliding window of recent tokens, runs sentinel checks, and aborts the stream + emits the safe fallback if a match is found. Vercel AI SDK supports this via `experimental_transform`.

Estimated effort: 1-2 days, mostly for testing the abort/recovery flow with real users.

### 4. Per-business origin allowlist for embed widget

Currently `/api/embed/chat` accepts any Origin header. PR #29 logs the origin into conversation metadata for post-hoc abuse tracing, but doesn't enforce. A determined abuser can pull a Pro-tier customer's `businessId` from any embedded widget script (it's in plain JavaScript) and hit `/api/embed/chat` from any domain, burning that customer's plan limits.

The Messenger bot doesn't have this attack surface (Meta authenticates incoming webhooks via HMAC). For Converso, the right defense is:

- Add `allowedOrigins: jsonb` to `Business` table.
- In `/api/embed/chat`, validate the request's `Origin` header against the allowlist.
- Default allowlist = `['*']` for backward compatibility; admin UI lets owners restrict.

Estimated effort: 1 day (schema migration + admin UI + validation logic).

### 5. Visitor-ID hashing in `WidgetConversation`

Currently we store raw visitor IDs (browser-generated UUIDs) in plaintext. The Messenger bot stores SHA-256 hashes of PSIDs only — its analytics table physically cannot leak user identifiers.

For Converso, the privacy story for Mexico (LFPDPPP) and similar regimes is stronger if we hash visitor IDs at ingest. Trade-off: lookups need to hash on the read path too, and existing rows (currently plaintext) need a migration.

Defer until after launch — clean cutover when no real user data exists yet, but tested carefully.

Estimated effort: 1-2 days including migration.

### 6. Source-mapped Sentry stack traces

PR #29 added `sourcemaps.disable: false` + `widenClientFileUpload: true` to `next.config.ts`. The infrastructure is now in place. The next step is the validation: deliberately throw an error in production, confirm Sentry shows TS line numbers (not minified `worker.js:1:9847`).

Estimated effort: 30 minutes to validate post-launch.

### 7. Bilingual structured strings (`strings.ts` pattern)

The Messenger bot centralizes all bilingual user-facing strings (handoff, error, rate-limited, invalid input) in one tiny module. Converso has bilingual strings scattered across `lib/utils/language-detector.ts`, individual route handlers, the embed widget loader, etc.

Centralizing them into `lib/i18n.ts` (or similar) would:
- Make translation review a single-file pass.
- Eliminate copy-paste drift (we have at least three different "rate limit reached" messages in different files today).
- Enable future i18n expansion (Portuguese for Brazil, etc.) with low marginal cost.

Estimated effort: 1 day refactor, low risk.

### 8. Triage remaining HIGH-severity dependency vulns

PR #29 went from 27 HIGH → 14 HIGH. The remaining 14 should be triaged: how many are in actually-used code paths vs. dev-only / build-time / deeply transitive? Most likely candidates for cleanup: Sentry webpack plugin transitives, Playwright transitives, leftover `cheerio`/`undici` paths.

Estimated effort: half a day to triage + bump what's safe.

---

## Worth STEALING but NOT for v1 — bigger commitments

### Cloudflare Workers runtime

The Messenger bot wins on runtime characteristics:

| Metric | Messenger bot (CF Workers) | Converso (Vercel/Next.js) |
|---|---|---|
| Cold start | ~5ms | 200–800ms |
| Geographic distribution | Edge global | Single region (iad1 default) |
| Cost at low volume | ~$5/mo flat | Growing with usage |
| Per-vendor surface | One (Cloudflare) | Multiple (Vercel + Neon + Upstash + Sentry + Stripe + Clerk) |

**Why we shouldn't switch this product to Workers:**

1. **SQL-shaped data.** Multi-tenant Postgres with RBAC, Stripe subscriptions, lead scoring, playbook flows, vector search across thousands of documents per tenant. Cloudflare Vectorize is great for 22 chunks; we're building toward thousands per tenant. D1 is great for analytics events; it's not great for transactional billing data.

2. **React component count.** ~99 components, an admin dashboard, a billing surface, a checkout flow, an onboarding flow. The Messenger bot is 1,500 LOC and 13 modules. Different shape entirely.

3. **Migration cost.** Months of work, not weeks. Zero customer-facing benefit during the migration window.

**Where Workers DOES make sense:** future single-channel single-tenant lightweight bots for individual clients — exactly the Messenger bot's shape. The Messenger bot template should remain the reference architecture for those engagements. Don't try to make Converso fit that shape.

### Single-runtime-dependency philosophy

The Messenger bot has ONE runtime dependency: `@sentry/cloudflare`. Everything else is `fetch`, Web Crypto, and Cloudflare bindings.

Converso has ~80 production dependencies. We can't get to 1. We can't get to 10. **But we can get more disciplined about additions.** The langchain removal in PR #29 (zero source-code usages, 5+ critical/high transitive vulns) is the model — every new dep should justify its weight against its attack surface.

Concrete rule going forward: **if a dependency adds more transitive deps than it has stars, justify it.** Re-audit `@langchain/community`-style accidents quarterly.

### KV-only state model

Converso's data model is fundamentally relational. We have foreign keys, joins, transactional billing operations, multi-table tenant isolation. KV is the wrong shape for that. Don't try to fight it.

What we CAN steal: **the TTL discipline.** The Messenger bot's KV writes always specify `expirationTtl`. There is no garbage collector, no cleanup job — state is self-cleaning. We should look at our `WidgetMessage`, `Conversation`, `Stream`, `Vote` tables and ask: which of these need to live forever? Which are operational state that should age out?

The PR #29 `purge-old-messages` cron is the first instance of this discipline. There are probably 3-5 more tables that warrant similar treatment.

---

## NOT worth stealing — different products, different right answers

### One-Worker-per-client deployment model

The Messenger bot template uses **one Cloudflare Worker per client**, with separate Sentry projects, separate KV namespaces, separate everything. Clean isolation; Robert runs 5–20 of these.

Converso's entire pitch is **multi-tenant SaaS**. One deployment, many customers, billing entirely self-service. The whole point is that adding the 50th customer is a database row, not an infrastructure deploy.

Both models are correct for their products. They're not in tension; they're complementary.

### Two-Meta-app token separation

The Messenger bot uses one Meta app for the bot runtime and a separate Meta app for page admin operations (least privilege). Smart pattern, totally specific to Meta's permission model. Doesn't translate.

The Converso analog would be: separate Stripe restricted keys for read-only billing display vs. write operations. That's a real hardening item but it's its own conversation, not a port from the Messenger architecture.

### Meta Handover Protocol

The Messenger bot uses Meta's official protocol for transferring conversation control to a human. This is Meta-platform-specific. Converso's live-chat handoff is internal (assigning a conversation to an admin user) and works differently because the channel is our own widget, not someone else's platform.

When Converso eventually integrates with WhatsApp Business properly (post-launch, post-Meta-verification), we WILL want the Handover Protocol — and we'll borrow the Messenger bot's `handover.ts` implementation directly. Until then, not relevant.

---

## Anti-patterns to actively AVOID

The Messenger bot review explicitly calls out a few honest fragilities. Two of them are warnings for Converso:

### "Read-modify-write rate limiting on KV without atomics"

The Messenger bot's rate limiter in `memory.ts:71-79` has a known race condition documented inline. Two simultaneous requests can both read `count=29` and both write `30`. The team's documented response: at scale, move to Cloudflare Durable Objects.

**For Converso, the analog is the in-memory fallback in `lib/rate-limit.ts`.** When Upstash Redis is unavailable (env vars missing, network blip), we silently degrade to a per-instance Map — which on Vercel serverless means rate limiting is essentially disabled (each Lambda has its own Map). PR #29 verified Upstash IS configured in production. But the silent degradation behavior is a footgun.

**Recommendation:** in production, fail closed if Redis is unavailable. Don't silently fall back. Add a startup health check.

### "System prompt is huge and lives in code"

The Messenger bot's ~7KB system prompt is in `claude.ts`. Every voice tweak is a code deploy. They built the voice-questionnaire admin frontend specifically to address this — pre-launch the prompt is data-driven.

**For Converso, this is already worse.** Our system prompts live partly in `lib/ai/prompts.ts` (hardcoded) and partly in admin-configured per-business instructions (DB-stored). The admin UI lets business owners tweak THEIR portion, but our portion still requires a deploy.

**Recommendation:** the hardcoded portion of the system prompt should be loaded from a `SystemPromptVersion` table at runtime. New versions are CRUD operations, not deploys. Major changes get an admin UI for review. This is a 2-3 day project, well worth doing within the first month post-launch.

---

## Measurement: how do we know this is working?

The Messenger bot review made a strong claim about durability. Here's how we measure whether Converso's post-PR-#29 hardening actually delivers:

| Signal | Target | Measured how |
|---|---|---|
| Prompt-injection rejection rate | <2% of total messages (false-positive ceiling) | `[embed-chat] input rejected` log line in Vercel logs, Sentry tagged events |
| Output-guard rejection rate | <0.5% of model responses | `[embed-chat] output rejected` log line |
| Median chat response time | <2.5s end-to-end | Vercel Analytics + Sentry transactions |
| 5xx rate on `/api/embed/chat` | <0.1% | Vercel Analytics |
| AI cost per 1000 widget messages | Down at least 20% from PR #28 baseline | OpenAI dashboard, weekly review |
| `pnpm audit --prod` critical count | 0 | CI Dependabot weekly check |
| `pnpm audit --prod` high count | <10 by end of May | Same |
| Sentry Mean Time To Detection | <5 minutes for new error classes | Sentry alert config |

If we miss any of these by month-end, the relevant guard / pattern needs revisiting — not just shipping more patterns.

---

## Honest assessment of the Messenger architecture review itself

The architecture review document Robert provided is high quality. It does what most architecture docs don't: it names the soft spots. Nine documented fragilities, each with a mitigation path. That's how you spot a real engineering doc vs. a marketing piece. We should **adopt the same posture for Converso's architecture documentation** — which currently is mostly marketing-style "look at what we built." The `BLUEPRINT.MD` and `PRD.md` files in `docs/` should each have a "Where this is fragile" section by end of May.

The Messenger architecture is also consciously *boring* in the right places. Every external call has retry + fallback. State has TTLs. Privacy is structural. Webhooks are HMAC-verified. Source maps map back to TypeScript. None of those are clever; all of them are correct. The discipline of "boring choices made consistently" is the part most worth importing.

---

*Maintainer note: revisit this document after one month of production traffic (target 2026-06-08) and a second time at three months (2026-08-08). Patterns we adopted should be measured. Patterns we deferred should be re-evaluated against actual traffic data, not pre-launch projections.*
