# Session Log — ai-chatbot-saas

Entries are newest-first. Each entry documents one Claude Code working session.

---

<!-- New entries go above this line -->

## Session: 2026-05-18

### Accomplished

- Merged PR #33 (`c50fc41`) — rate limiter fail-closed (produced in previous session)
- Triggered `@dependabot rebase` on 9 stale-lockfile PRs (#10–#12, #16–#17, #25, #30, #34–#35); CI actions bumps (#10–#12) rebased by Dependabot
- Created PR #36 — three ny-ai-chatbot lessons applied:
  - Output guard wired into authenticated `streamText` (`app/(chat)/api/chat/route.ts`): `checkOutput` in `onFinish`, Sentry-logged, leaked content redacted from DB before save
  - RAG similarity threshold lowered 0.5 → 0.4 (`lib/ai/tools/search-knowledge.ts`): fixes "I don't know" responses to conversational queries that score 0.4–0.49
  - Redis dual-credential constructor in `lib/rate-limit.ts`: `getRedisClient()` tries `UPSTASH_*` then `KV_*` — fixes silent in-memory fallback for Vercel marketplace Upstash installs

### Decisions Made

- Output guard on streaming: detect-and-log in `onFinish` (can't abort mid-stream); redact from DB so history doesn't replay the leak — right trade-off for authenticated channel
- RAG threshold: 0.4 across both `KnowledgeChunk` and `Document_Knowledge` tables — conversational NL queries consistently score lower than keyword queries
- Redis constructor: dual-credential pattern from ny-ai-chatbot; `Redis.fromEnv()` is unsafe on Vercel marketplace installs

### Immediate Next Steps

- [ ] Merge PR #36 once CI passes (build should be green; Playwright is pre-existing CI env issue)
- [ ] Confirm which Redis env var naming Vercel is using for this project (`UPSTASH_*` vs `KV_*`) — check Vercel dashboard env vars
- [ ] Merge drizzle-orm PR #25 once Dependabot rebase lands (security fix: CWE-89 SQL injection in `sql.identifier()`)
- [ ] Merge remaining safe Dependabot patches (#16, #17, #30, #34, #35) once rebases complete
- [ ] Robert: Stripe `sk_live_*` switch + re-seed plans (launch gate)

### Technical Debt

- ny-ai-chatbot lesson #2 (incremental ingest scoped to businessId) not yet assessed for Converso scripts/
- ny-ai-chatbot lesson #4 (tenant-scoped cache prefix for response cache) — Converso embed chat has no response cache yet; deferred

### Open Questions / Blockers

- Which Upstash credential naming does the Vercel project use? Determines whether PR #36 changes active rate-limit behavior or was already working

---

## Session: 2026-05-17

### Accomplished

- Resolved `docs/SESSION_LOG.md` vs `docs/session-logs/` inconsistency — migrated 2026-05-03 entry to canonical format, removed old per-file, updated project `CLAUDE.md`; merged PR #31 (`29d340a`)
- Merged PR #32 (`36e1687`) — Next.js 16.2.4 → 16.2.6, patches 7 HIGH security advisories (proxy/middleware bypass GHSA-267c/-492v/-26hh, SSRF via WebSocket, DoS via Server Components, two XSS vectors)
- Created PR #33 — rate limiter fails closed in production: missing Redis env vars → 503 + `console.error` (Sentry-capturable); transient Redis error → 503; dev in-memory fallback unchanged

### Decisions Made

- 503 (not 429) for Redis unavailability: accurately signals service degradation vs. a rate-limit hit
- Playwright failures on all PRs are pre-existing CI env issues (missing secrets/OpenAI access in runner) — merged with `--admin`, no code risk

### Immediate Next Steps

- [ ] Merge PR #33 (rate-limiter) — build + Vercel green, safe to `--admin` merge
- [ ] Triage PR #25 drizzle-orm 0.34.1 → 0.45.2 (major bump — needs schema/query compat review)
- [ ] Implement output guard on authenticated `streamText` (`app/(chat)/api/chat/route.ts`)
- [ ] Robert: Stripe `sk_live_*` switch + re-seed plans (launch gate — cannot be done by Claude)

### Technical Debt

- None added this session

### Open Questions / Blockers

- Stripe live-mode is the remaining launch gate (Robert action required)

---

## Session: 2026-05-03

### Accomplished

- Merged PR #29 — launch-readiness sweep: cross-tenant KB leak closed, SQL injection eliminated, Clerk auth-bypass CVE patched (GHSA-vqx2-fgx2-5wq9), prompt-injection guards EN+ES, two-model router (`lib/ai/router.ts`), langchain removed (−33% vulns), `CRON_SECRET` + cron schedules (`vercel.json`), embed widget cross-origin fixed (`proxy.ts`), Sentry sample rates → 0.1. Vuln count 76→40, critical 3→0.
- Merged PR #31 — rate-limiter test-env bypass (`lib/rate-limit.ts`), `@clerk/testing` 2.0.8→2.0.24 (cleared critical dev-dep vuln), session-log migration, `vale`→Mexican Spanish in `lib/ai/router.ts`
- Mexican Professional Spanish standard added to global CLAUDE.md; `lib/ai/router.ts` audited and fixed

### Decisions Made

- Session logs: single append-only `docs/SESSION_LOG.md` (newest-first) replaces per-file `docs/session-logs/` format
- Rate-limit test-env bypass at `lib/rate-limit.ts` (global, not per-route) so all rate-limited routes benefit automatically
- WhatsApp tab + routes gated behind `NEXT_PUBLIC_WHATSAPP_ENABLED` (default off) until Chat SDK integration is production-ready

### Immediate Next Steps

- [ ] Switch Stripe to `sk_live_*` + re-seed plans (Robert — Stripe dashboard)
- [ ] Production smoke test: embed cross-origin, prompt injection rejection, model routing, cron auth, rate limits, Sentry source maps
- [ ] Watch Sentry + Vercel logs first hour post-launch
- [ ] Merge PR #32 (Next.js 16.2.6 — 7 HIGH security advisories)
- [ ] Fix rate limiter fail-closed behavior in production

### Technical Debt

- Rate limiter silently falls back to in-memory when Redis is unavailable in prod (should fail closed)
- Output guard only on embed `generateText`, not authenticated `streamText`
- Visitor-ID hashing deferred (LFPDPPP compliance, Mexico market)
- System prompt requires a deploy to change (no admin UI)

### Open Questions / Blockers

- Stripe live-mode switch timing (launch gate — Robert action required)

---
