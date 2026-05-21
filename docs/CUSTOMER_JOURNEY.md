# Converso AI — Customer Journey

End-to-end walkthrough of the typical customer experience, from first landing on the site through running a chatbot in production. Captures the smooth path **and** the friction points that should be addressed before aggressive marketing.

Audience: Robert (PM/PO), future contributors, hiring managers reviewing the portfolio. Not customer-facing.

---

## 1. Discovery — landing page (`/`)

Customer hits **converso.chat**. The landing page (`components/converso-landing.tsx`) sells the value prop: _AI chatbot for your service business, bilingual EN/ES, 24/7 lead capture._ Positioned for the Mexico market.

**What they see:** hero, feature highlights (RAG over their own knowledge, multi-tenancy, visual playbook builder, live-agent handoff), pricing tiers (Starter / Pro / Business — monthly or annual), and a CTA: _Sign up free_.

**Friction:** no interactive demo on the landing page itself — visitors can't try the chat without signing up. Competing tools all let you chat with a demo bot. Adding one would lift signup conversion. Not a launch blocker but the biggest pre-scale conversion opportunity.

## 2. Sign up — Clerk auth (`/sign-up`)

Click sign up → Clerk modal → email/password or social provider. On successful sign-up, the Clerk webhook (`app/api/clerk/webhook/route.ts`) creates two DB records:

- `User` — Clerk `userId` synced
- `Business` — `onboardingStatus: "pending"`, `onboardingStep: 1`

They land in the admin dashboard with their `businessId` set on every subsequent request.

## 3. Onboarding — multi-step setup

The schema's `Business.onboardingStep` counter drives a guided flow. Four stages.

### Step 1 — Tell us about your business

Name, industry, default language. Defaults to `es-MX`, switchable to `en-US`. Saved to the `Business` record.

### Step 2 — Knowledge base (the "magic step")

Two ingest paths, both via `app/api/admin/knowledge/ingest`:

**Website crawl** (most customers):

- Paste their domain like `cushlabs.ai`
- Crawler discovers their sitemap (tries `/sitemap.xml`, `/sitemap-0.xml`, `/robots.txt`); falls back to crawling links from the homepage
- Capped at 20 pages for the onboarding timeout window
- Each page: scraped (Cheerio strips nav/footer/script), chunked (~1000 chars with 200-char overlap), embedded via OpenAI `text-embedding-3-small`, written to `KnowledgeChunk` with a `content_hash` — re-ingest is incremental, only new/changed chunks pay the embedding cost
- UI streams progress: `discovering → scraping → scraped → complete` with per-page counts

**PDF upload** (`app/api/admin/knowledge/pdf`):

- Drop a PDF, server extracts text, same chunking + embedding pipeline

### Step 3 — Customize

Three sub-screens in the admin shell:

- **System instructions** (`components/admin-system-instructions.tsx`) — tone, persona, refusal rules
- **Starter questions** (`components/admin-starter-questions.tsx`) — the 3 suggested questions visitors see in the empty widget state
- **Playbooks** (optional, advanced) — visual flow builder (React Flow). Build things like _if user asks about pricing → ask for email → queue handoff_. Most customers skip this initially. Includes cancel-keyword and 2-attempt-validation guard rails so users aren't trapped in data-collection loops.

### Step 4 — Install

`components/admin-embed-code.tsx` shows a copy-paste JavaScript snippet that loads `/api/embed?botId=…`. That endpoint returns a JS file which injects a styled chat bubble + iframe pointing at `/embed/chat`. Two lines into the customer's `<head>` and the widget is live.

**Friction here:** step 4 assumes the customer can edit their website's source. Service-business owners often can't — they hired someone to build their site. Plain-English platform-specific guides (WordPress, Shopify, Wix, Squarespace) would massively reduce drop-off at the final step. **This is the single biggest friction point in the journey.**

## 4. Try it — admin preview

The admin dashboard includes a preview chat that hits the same `/api/embed/chat` endpoint. The customer chats with their own bot using the real knowledge base **before** they install on their website. This is the conversion moment — _oh wow it knows my business_ — driven by:

- RAG over **only** their business's content (`businessId` filter enforced at the SQL level — no cross-tenant leakage)
- Similarity threshold of 0.4 (lowered from 0.5 so conversational queries like _do you do residential work?_ actually match)
- Two-model routing: short pleasantries → `gpt-4o-mini` (cheap, fast), knowledge-bearing queries → `gpt-4o` (high-quality)
- Input safety: prompt-injection refusal in EN + ES
- Output safety: system-prompt-leak detection, leaked content redacted from the DB before save

## 5. Purchase — Stripe checkout

The customer hits a paywall when they exceed the free tier (or want to install on a second site). Click _Upgrade_ → `app/api/stripe/checkout/route.ts` creates a Stripe Checkout session keyed to the plan (`STRIPE_PRICE_STARTER_MONTHLY`, etc.) → Stripe-hosted page → on success, redirected back to `/admin/billing?success=true`.

The Stripe webhook (`app/api/webhooks/stripe/route.ts`) fires asynchronously:

- Creates a `Subscription` row
- Sets `Business.subscriptionStatus = "active"`
- Unlocks higher message limits and bot count per the plan tier (`lib/db/queries-billing.ts`)

**Plans:**

| Plan     | Bots     | Monthly messages | Playbooks | White-label |
| -------- | -------- | ---------------- | --------- | ----------- |
| Starter  | 1        | (per Plan row)   | Basic     | No          |
| Pro      | Multiple | Higher           | Advanced  | No          |
| Business | Multiple | Highest          | Advanced  | Yes         |

Monthly and annual cycles on each tier.

## 6. In production — the widget is live

The embed snippet is already running on the customer's website (from step 4). Visitors see a chat bubble in the bottom-right. When clicked, an iframe loads `/embed/chat` with the businessId. End-to-end conversation flow:

1. Visitor types a question
2. `app/api/embed/chat/route.ts` is hit
3. Postgres-backed sliding-window rate limit checks IP burst budget (30/min default)
4. Input safety guard (prompt-injection refusal)
5. Plan-based monthly message limit check
6. Playbook trigger check (keyword, intent, URL pattern, or first-message based)
7. If no playbook fires: model routing → RAG search scoped to this business → response generation with output safety guard
8. Conversation, messages, any captured contacts (email/phone) saved to DB scoped to `businessId`
9. If a handoff playbook fires: row added to `liveChatQueue` for a human agent

If conversation triggers handoff and the data-collection step fails validation twice in a row, the playbook engine sets execution status to `abandoned` and shows a graceful EN/ES fallback message. The user can also type `cancel` / `cancelar` / `stop` / `exit` to bail out cleanly.

## 7. Operate the business — admin dashboard

The customer logs in any time to:

- **Conversations** — see who chatted, what was asked, escalations
- **Contacts / leads** — captured emails and phones, follow-up status (`Contact`, `ContactActivity` tables)
- **Knowledge** — re-ingest after they update their website. The `content_hash` system means a 1000-page site where one page changed only re-embeds the chunks from that page (massive cost saving vs. the old TRUNCATE-and-re-embed pattern)
- **Playbooks** — build new automations or edit existing ones
- **Live chat** — pick up handed-off conversations as a human agent
- **Billing** — manage subscription via the Stripe portal
- **Settings** — system instructions, starter questions, branding

### Background work the customer doesn't see

- `app/api/cron/retrain` runs nightly and detects site changes worth re-ingesting
- Sitemap scans on a configurable schedule per business (`SitemapScan` table)
- Probabilistic GC on the rate-limit table keeps it bounded
- Sentry error monitoring catches runtime exceptions and alerts the operator

## Channels: web today, WhatsApp coming

**Today** the deployable channel is the JavaScript embed widget. 100% of customers use it.

**In active development** (`feat/whatsapp-chat-sdk` branch): WhatsApp. A customer maps their WhatsApp Business phone number (Meta Graph API) to their `Business` via the `WhatsappPhoneMapping` table, and the same bot — same knowledge base, same playbooks, same handoff — responds via WhatsApp DM. The Vercel Chat SDK abstraction (`lib/channels/`) is designed to make Slack and SMS follow cheaply.

**Strategic relevance:** in Mexico, WhatsApp is how businesses actually talk to customers. Being WhatsApp-native is the biggest differentiator vs. North-American-built competitors.

---

## Friction points to fix before aggressive marketing

Ordered roughly by impact on conversion / retention:

1. **No try-before-signup on the landing page.** Competing tools all let you chat with a demo bot before signing up. Highest-leverage lift available.
2. **Step-4 install assumes website-source access.** Plain-English platform-specific guides (WordPress, Shopify, Wix, Squarespace) would close the largest drop-off point.
3. **No domain allowlist enforced on the embed.** Schema surface exists but enforcement is deferred. Means a customer's bot can technically be embedded on any site with the JS snippet. Low real-world abuse risk pre-scale; should be locked down before broad marketing.
4. **Plan upgrade prompts are reactive, not proactive.** At 80% of monthly message cap the dashboard should nudge with usage analytics — don't wait for the hard wall.
5. **Generic widget cold-open.** Letting customers brand the widget (logo, color, welcome copy beyond the starter questions) is a natural Pro-tier hook.

## Launch state (as of 2026-05-20)

- Multi-tenant isolation, RAG, embed widget, admin dashboard, playbooks, live-chat handoff, Stripe billing wiring, output and input safety guards — all in production
- Stripe is still in **test mode**. The `sk_live_*` switch + re-seeding plans against the live Stripe account is the only thing between this and open-for-business
- WhatsApp integration in active development on a separate branch
- Vulnerability count down to 9 (2 high) from 44 after the security-focused dep cleanup
- Rate limiter, RAG threshold, output guard, dedup detection, and Playwright noise reduction all landed in the 2026-05-18 → 2026-05-20 push

See `docs/SESSION_LOG.md` for the working-session-by-session change history.
