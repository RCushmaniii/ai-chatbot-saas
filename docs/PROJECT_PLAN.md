---
# PROJECT_PLAN — Bilingual AI Front Desk & Sales Assistant (v1)

This plan is implementation-oriented and aligns with:

- `docs/BLUEPRINT.MD`
- `docs/FORMAL_PLAN.md`
- `docs/PRD.md`

---

## 1) Recommended stack (v1)

This repo currently uses Next.js/TypeScript/Postgres+pgvector patterns; the v1 plan below stays compatible with that direction.

### 1.1 Frontend

- Next.js (App Router)
- React
- Tailwind + shadcn/ui
- i18n for `en`/`es` UI labels
- Embed widget (script + iframe) for public visitor chat

### 1.2 Backend

- Node.js (TypeScript)
- API layer:
  - Option A (fastest path): Next.js Route Handlers (monolith)
  - Option B (service split later): Fastify or NestJS
- Validation: Zod
- Background jobs: a job queue (BullMQ/Redis or provider-managed) for ingestion/embedding

### 1.3 Data

- Postgres (Neon/Supabase)
- Vector storage:
  - Preferred v1: Postgres `pgvector` with tenant-scoped filtering
  - Optional later: external vector DB (Pinecone/Qdrant) per tenant namespace
- Object storage:
  - S3-compatible or existing blob provider for PDFs and uploaded assets

### 1.4 AI

- Provider router supporting OpenAI / Anthropic / Gemini (Blueprint-aligned)
- Embeddings:
  - Blueprint suggests `text-embedding-3-large` (choose final model early)
- Vision:
  - Optional v1 for image-to-text extraction (only if required)
- No fine-tuning in v1

---

## 2) System architecture (module boundaries)

### 2.1 Services / modules

- **Auth & Tenancy**
  - users, businesses, memberships, roles
- **Bots**
  - bot registry, embed config, channels
- **Knowledge**
  - sources → processing → chunks → embeddings → retrieval
- **Conversation runtime**
  - session, messages, streaming, citations
- **Lead qualification**
  - intent, intake flow, scoring, persistence
- **Scheduling**
  - provider integration OR booking intent capture
- **Handoff**
  - notifications + handoff packet creation
- **Billing & entitlements**
  - plans, subscriptions, quotas
- **Admin & analytics**
  - logs, RAG insights, lead funnel, usage/cost
- **AI orchestration**
  - routing, prompts, tools, safety

### 2.2 Data flow (happy path)

1. Visitor starts chat (embed).
2. System detects language per message.
3. System retrieves tenant-scoped knowledge (deterministic RAG).
4. System generates answer with citations.
5. If commercial intent: run intake → score lead → store lead.
6. If booking: schedule or capture booking intent.
7. If hot lead or request: create handoff packet → notify staff.
8. Admin dashboard shows conversations, leads, bookings, RAG gaps.

---

## 3) Database schema outline (v1)

This is an outline; final fields are refined during Phase 1.

### 3.1 Tenancy

- `businesses`
  - `id`, `name`, `timezone`, `created_at`
- `users`
  - `id`, `email`, `password_hash`, `created_at`
- `memberships`
  - `id`, `business_id`, `user_id`, `role`

### 3.2 Bots

- `bots`
  - `id`, `business_id`, `name`, `status`, `created_at`
- `bot_settings`
  - `bot_id`
  - embed UI config
  - language defaults
  - handoff routing config
  - starter questions
- `bot_personality`
  - `bot_id`
  - brand voice profile (structured JSON)

### 3.3 Knowledge

- `knowledge_sources`
  - `id`, `business_id`, `bot_id?`, `type` (website/url/pdf/text)
  - `source_url?`, `file_key?`, `status`, `last_ingested_at`, `error`
- `knowledge_chunks`
  - `id`, `business_id`, `source_id`
  - `content`, `language`, `metadata` (title/url/section)
  - `embedding` (vector) or `embedding_id`
  - indexes for tenant + vector search

### 3.4 Conversations

- `conversations`
  - `id`, `business_id`, `bot_id`, `channel` (embed/web)
  - `visitor_id?`, `started_at`, `ended_at`
- `messages`
  - `id`, `conversation_id`, `role`, `content`, `language`, `created_at`
- `conversation_events`
  - `id`, `conversation_id`, `type` (lead_scored, handoff, booking)
  - `payload` JSON, `created_at`

### 3.5 Leads & scheduling

- `leads`
  - `id`, `business_id`, `conversation_id`
  - `score` (cold/warm/hot)
  - `contact` JSON, `fields` JSON, `summary`
  - `status`, `created_at`
- `bookings`
  - `id`, `business_id`, `lead_id?`, `provider`, `provider_ref?`
  - `start_time`, `end_time`, `status`

### 3.6 Billing & usage

- `plans`
- `subscriptions`
- `usage_counters` (messages/tokens/conversations)
- `audit_logs`

---

## 4) Knowledge ingestion pipeline (v1)

### 4.1 Pipeline stages

- **Input**: sitemap, url list, PDF, text.
- **Fetch/Extract**:
  - website: fetch HTML + strip boilerplate
  - PDF: extract text
- **Normalize**:
  - language tagging (if known) + safe text cleanup
- **Chunk**:
  - fixed-size chunks with overlap
- **Embed**:
  - generate embeddings; cache per chunk hash when possible
- **Store**:
  - tenant-scoped chunks + vectors
- **Observe**:
  - per-source job status
  - error logs
  - counts of chunks created

### 4.2 Operational requirements

- Runs async (background jobs) for non-trivial sources.
- Admin can:
  - start ingestion
  - see progress
  - retry failed sources
  - delete sources

---

## 5) Conversation orchestration logic (v1)

### 5.1 Runtime loop

For each user message:

1. Detect language.
2. Classify intent:
   - FAQ/support
   - lead intent
   - booking intent
   - escalation request
3. Retrieve tenant-scoped knowledge (top-K).
4. Build system context:
   - brand voice modifiers
   - bilingual rules
   - retrieved snippets + citations
5. Generate response (stream if possible).
6. If lead intent: run intake questions and persist structured lead.
7. If booking intent: trigger scheduling agent or booking intent capture.
8. If hot/escalation: create handoff packet and notify.

### 5.2 Lead scoring

- Deterministic scoring rubric + LLM-assisted classification is acceptable.
- Store the “why” behind score (signals) for admin review.

### 5.3 Handoff packet

- Must include:
  - contact fields
  - transcript
  - summary
  - recommended next action

---

## 6) AI model usage strategy (v1)

### 6.1 Routing policy

- Cheap model:
  - language detection (if LLM-based)
  - intent + classification
  - summarization for admin/handoff
- Mid-tier model:
  - standard responses
- Premium model:
  - sales-critical moments only

### 6.2 Cost controls

- Plan-gated premium usage
- Caching embeddings
- Limits per tenant and per channel

---

## 7) Admin dashboard plan (v1)

### 7.1 Screens

- Setup checklist (bot + embed + knowledge)
- Knowledge sources + status + retry
- Conversations + search
- Leads (filters + handoff)
- Bookings
- RAG insights (missed questions / low-context)
- Usage/cost

### 7.2 RAG insights events to implement

- `no_context_found`
- `low_similarity_context`
- `conflict_detected` (two sources disagree)
- `user_reported_wrong_answer`

---

## 8) Security & compliance plan (v1)

- Tenant isolation at DB access boundary.
- Encryption at rest + in transit.
- Scoped API keys (bot/channel keys).
- Rate limiting per tenant/channel.
- Audit logs for admin actions.
- GDPR deletion flow (tenant export + delete).
- Prompt injection defenses:
  - treat retrieved content as data
  - tool allowlists

---

## 9) 90-day roadmap (milestones)

### Milestone A (Days 1–30): Foundation

- Tenancy + roles implemented
- Bot creation + embed installation
- Basic chat runtime (web + embed)
- Billing + quotas skeleton
- Logging + basic admin shell

### Milestone B (Days 31–60): Knowledge & RAG

- Ingestion jobs for website/URL/PDF/text
- Tenant-scoped vector search + citations
- Admin knowledge management + ingestion status
- RAG insights events recorded

### Milestone C (Days 61–90): Bilingual + Brand Voice + Scheduling

- Per-message language behavior across flows
- Brand voice profile extraction + prompt modifiers
- Scheduling MVP or booking-intent capture
- Human handoff notifications + packet
- Launch readiness checklist complete

---

## 10) Key open decisions (confirm early)

- Scheduling provider (Calendly vs Google Calendar vs Acuity)
- Billing (Stripe tiers + usage add-ons)
- Vector store strategy (pgvector-only vs external later)
- Data retention windows and deletion controls
- Handoff notification channel (email-only v1 vs SMS later)

---
