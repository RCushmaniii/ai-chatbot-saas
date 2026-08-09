# Repo Purpose & Ecosystem Map

> **You are here:** `ai-chatbot-saas` — product name **Converso AI**, a standalone multi-tenant
> bilingual AI chatbot SaaS. Not part of a multi-repo platform family; its ecosystem connections
> are to the CushLabs portfolio site and shared infrastructure conventions, not to a sibling repo.

_Last verified: 2026-08-09._

## What this repo is

**ai-chatbot-saas** ships **Converso AI**: a white-label, bilingual (EN/es-MX) AI front-desk and
sales assistant that service businesses embed on their own sites. Each tenant gets an isolated
knowledge base, a visual playbook builder, a lead pipeline, live-chat handoff, and Stripe billing.

- **Runtime:** Next.js 16 (Vercel), PostgreSQL + pgvector (Drizzle ORM), Clerk auth, Stripe billing
- **Product domain:** soyconverso.com — this repo's own marketing + app domain, not shared with
  any other repo
- **Deploy model:** single-tenant-per-deploy is the current shipping model (`docs/SESSION_LOG.md`,
  Session 2026-06-09) — true self-serve multi-tenant onboarding is a stated but not-yet-built
  capability

## How it relates to other CushLabs repos

Unlike the Messenger platform (`cushlabs-messenger` / `cushlabs-messenger-bot`) or the WhatsApp
line (`cushlabs-whatsapp` / `cushlabs-connect`), **this repo is not one half of a multi-repo
product** — it's a standalone SaaS. Its only two real connections to the rest of the CushLabs
fleet:

1. **`cushlabs` (the portfolio/marketing site) embeds this repo's widget as a live demo.**
   `cushlabs/src/layouts/BaseLayout.astro` hardcodes `DEMO_URL =
'https://www.soyconverso.com/embed/chat'` and treats it as "CushLabs bot served by the Converso
   SaaS (one tenant per deploy)," with a `postMessage` origin check against `soyconverso.com`.
   `cushlabs/src/data/projects.generated.json` also carries a portfolio card for this repo with
   `demoUrl`/`homepage` pointing at soyconverso.com. **This repo's own `portfolio.md` has
   `live_url`/`demo_url` left blank** — the downstream generated file on the `cushlabs` side is
   currently the only place the real URL is recorded. That's backwards from how `portfolio.md` is
   supposed to work (source of truth here, generated files downstream) — worth fixing the next
   time someone's in this file.
2. **Shared infrastructure conventions, no shared code.** Sentry org `cushlabsai` (project slug
   `cushlabs-chatbot-saas`) follows the same one-project-per-repo pattern as every other CushLabs
   repo. `vercel.json`'s `ignoreCommand` for docs-only commits matches the fleet-wide
   deploy-hygiene convention. Rate limiting is the one deliberate divergence — Postgres
   sliding-window instead of the Upstash Redis pattern used elsewhere (`lib/rate-limit.ts`), a
   choice to avoid an Upstash dependency for this repo specifically.

## Not yet in the capability registry

`operating-system/cushlabs/capability-registry.json` is the single source of truth for
platform-approval status (Meta, Stripe, etc.) across the CushLabs fleet — its `_meta.consumers`
list currently covers `cushlabs`, `cushlabs-connect`, `cushlabs-marketsignal`,
`cushlabs-messenger`, `cushlabs-messenger-bot`, `cushlabs-whatsapp`, and
`cushlabs-ai-voice-agent`. **`ai-chatbot-saas` is not on that list.** If Converso AI ever needs a
tracked platform approval (a future WhatsApp/Meta integration, for instance — see
`docs/WHATSAPP_INTEGRATION_LOG.md`), it needs to be added as a consumer first. Don't restate
approval status in this file — check the registry.

## Keeping this doc honest

- This file is local to this repo — it doesn't mirror a shared table the way the Messenger
  family's three `REPO_PURPOSE.md` copies do, because this repo has no sibling repos to stay in
  sync with.
- The `soyconverso.com` embed on the `cushlabs` homepage is the relationship most likely to
  silently drift (URL changes, embed contract changes, tenant ID changes). If `/embed/chat`
  behavior changes here, check `cushlabs/src/layouts/BaseLayout.astro` for the hardcoded
  `DEMO_URL` and `postMessage` origin check before assuming the homepage demo still works.
- Update this file the same day anything above changes — a stale ecosystem map is worse than no
  map.
