# Session Log — ai-chatbot-saas

Entries are newest-first. Each entry documents one Claude Code working session.

---

<!-- New entries go above this line -->

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
