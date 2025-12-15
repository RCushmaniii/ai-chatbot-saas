---
# Formal Plan — Bilingual AI Front Desk & Sales Assistant (v1)

This document is the **single source of truth execution plan** for building the production-ready SaaS described in `docs/BLUEPRINT.MD`.

## 0) Non‑Negotiables (v1)

- **Target user**
  - Service businesses operating in bilingual English–Spanish environments.
- **Core product capabilities**
  - Bilingual conversations with **per-message language detection**.
  - Brand voice learning from uploaded content.
  - Knowledge ingestion from:
    - websites
    - URLs
    - PDFs
    - text input
  - Lead qualification (cold / warm / hot).
  - Appointment scheduling.
  - Smart human handoff.
  - Admin dashboard with logs, analytics, and RAG insights.
- **Platform requirements**
  - Multi-tenant SaaS architecture.
  - Tenant-isolated data and vector stores.
  - Modular AI agents (future expansion).
  - Cost-controlled LLM routing.
  - Secure auth + billing.

## 1) Operating Principles (how we execute)

- **Outcome-first**
  - Every feature must tie to lead capture, qualification, booking, or support deflection.
- **Opinionated v1 scope**
  - Build a narrow, sellable v1. Defer marketplace/complex integrations.
- **Tenant isolation by default**
  - No cross-tenant reads/writes in the application layer.
  - Enforce isolation at the database query boundary.
- **Server-side authority**
  - Business logic, entitlements, ingestion, and retrieval are server-controlled.
- **Bilingual everywhere it matters**
  - User-facing labels and assistant outputs must support `en` + `es`.
- **Observability is a feature**
  - Logs, metrics, and “what went wrong” tooling ship with core flows.

## 2) Architecture Direction (v1)

This plan assumes a **single product** with clear module boundaries. Whether it is shipped as a monolith (Next.js app + API routes) or split into services later, the boundaries below remain consistent.

### 2.1 Core modules

- **Identity & Tenancy**
  - Users, businesses (tenants), memberships/roles.
- **Bots**
  - Bot config, embed settings, channels (web widget).
- **Knowledge**
  - Knowledge sources, chunking, embeddings, vector search.
- **Conversations**
  - Sessions, messages, events, feedback.
- **Leads**
  - Lead capture, qualification score, handoff payload.
- **Scheduling**
  - Availability, booking intents, booking confirmation.
- **Billing & Entitlements**
  - Plans, quotas, overages, feature flags.
- **Admin & Analytics**
  - Conversations, lead funnel, RAG gaps, costs.
- **AI Orchestration**
  - Model routing, tool calling, safety and injection defenses, brand voice profile.

### 2.2 Tenant isolation (implementation requirement)

- All records are scoped by at least one of:
  - `business_id` (preferred)
  - `bot_id` (must map to a `business_id`)
- All retrieval queries must filter by tenant scope.
- Vector search must be tenant-scoped:
  - either via a per-tenant namespace
  - or via `business_id` filtering in the vector table/index

### 2.3 AI strategy (aligned with Blueprint)

- **Routing**
  - Cheap + fast model for intent + classification tasks.
  - Mid-tier model for normal responses.
  - Premium model for “sales moments” only.
- **Language layer**
  - Detect language per message.
  - Normalize internal state.
  - Respond in the same language.
  - Maintain tone parity.
- **Brand voice engine**
  - Extract:
    - sentence length
    - formality
    - vocabulary
    - emotional tone
  - Apply as system prompt modifiers and cross-language consistency rules.

## 3) Data Model Outline (v1)

This is an outline to guide implementation; exact schema may evolve.

### 3.1 Core

- `users`
- `businesses`
- `memberships` (user ↔ business role)
- `plans`
- `subscriptions`

### 3.2 Bots

- `bots` (belongs to business)
- `bot_settings`
- `bot_agents` (future expansion)
- `bot_personality` (brand voice + tuning knobs)

### 3.3 Knowledge

- `knowledge_sources` (website, url, pdf, text)
- `knowledge_chunks`
- `embeddings` (or embedding columns on chunks)

### 3.4 Conversations + outcomes

- `conversations`
- `messages`
- `conversation_events` (handoff, booking intents, lead capture)
- `leads` (qualification + contact + summary)
- `bookings` (provider refs, time slot, status)

### 3.5 Audit & analytics

- `audit_logs`
- `usage_counters` (tokens, messages)
- `cost_ledger` (optional v1 if needed for margin visibility)

## 4) Admin Dashboard (v1)

### 4.1 Required screens

- **Tenant setup**
  - Create business, create bot, get embed code.
- **Knowledge management**
  - Add website/sitemap; add URL; upload PDF; paste text.
  - Ingestion status and error visibility.
- **Conversations**
  - Browse/search conversations.
  - Flag bad answers.
- **Leads & bookings**
  - List leads, filters (cold/warm/hot), summaries.
  - Booking outcomes.
- **RAG insights**
  - “Missed questions” / low-confidence / no-context events.
  - Sources used, top chunks, recency.
- **Settings**
  - Brand voice controls.
  - Handoff routing configuration.
  - Language defaults.

## 5) Security & Compliance (v1)

Implementation must include:

- Tenant isolation
- Encrypted storage
- API key scoping
- Rate limiting
- Audit logs
- GDPR-ready deletion
- Prompt injection defense
- Jailbreak prevention

## 6) Phased Roadmap (Blueprint-aligned)

This is the delivery sequence we follow.

### Phase 1 — Foundation

**Outcome:** a tenant can sign up, create a bot, and run a basic chat.

- Auth (business + member roles)
- Billing + plan gating (at least one paid plan + quotas)
- Bot creation + embed installation path
- Basic chat runtime (web + widget)
- Logging + operational dashboards (minimum viable)

### Phase 2 — Knowledge & RAG

**Outcome:** the assistant answers with grounded context and admin can manage knowledge.

- Ingestion: website, URL, PDF, text
- Chunking + embedding + vector search with tenant isolation
- Source attribution and retrieval transparency (admin)
- RAG insights (missed questions, low-context events)

### Phase 3 — Multilingual & Brand Voice

**Outcome:** native bilingual experience + consistent tone.

- Per-message language detection and response parity
- Brand voice profile extraction + application
- Brand voice controls + previews

### Phase 4 — Mini Agents

**Outcome:** core business actions beyond Q&A.

- Appointment scheduler agent
- Quote generator (simple, templated)
- CRM hooks (minimal: webhook/export)

### Phase 5 — Sales Assistance

**Outcome:** better conversions on high-intent moments.

- Objection handling patterns
- Smart handoff routing + notifications
- Payments handoff (link out, provider integration optional)

### Phase 6 — Scale & Polish

**Outcome:** production hardening for growth.

- Analytics, cost controls, performance
- Enterprise readiness (SLA features, advanced audit)

## 7) 90-Day Execution Plan (milestones)

This translates the phases into a realistic 90-day v1 path.

### Days 1–30 (Foundation)

- Tenancy model implemented (businesses, memberships, roles)
- Bot + embed “happy path” complete
- Basic chat operational and logged
- Billing + plan gating skeleton live

### Days 31–60 (Knowledge + RAG)

- All ingestion paths operational (website/URL/PDF/text)
- Tenant-scoped retrieval and citations
- Admin knowledge management + ingestion status
- RAG gap events captured and visible

### Days 61–90 (Bilingual + Brand Voice + Scheduling)

- Native bilingual behavior and localized UI labels
- Brand voice profile extraction + prompt modifiers
- Appointment scheduling MVP
- Human handoff payloads (summary + transcript + contact)

## 8) Definition of Done (v1)

A tenant is “ready to go live” when:

- They can create a business + bot and install the embed.
- The assistant answers grounded FAQs with source traces.
- It qualifies leads with cold/warm/hot and stores the outcome.
- It can schedule appointments (MVP) or capture scheduling intent with follow-up.
- It supports `en` + `es` labels in UI and native responses.
- Admin can see conversations, leads, bookings, and RAG gaps.
- Tenant isolation is verified by tests.

## 9) Open Decisions (must be answered early)

- Scheduling provider:
  - Calendly?
  - Google Calendar + custom availability?
  - Acuity?
- Billing:
  - Stripe subscriptions + usage-based add-ons?
- Vector store:
  - Postgres pgvector only?
  - External vector DB (Pinecone/Qdrant) for scale?
- Data retention + deletion policy (GDPR):
  - default retention window?
  - per-tenant controls?
- Handoff channels:
  - email only in v1?
  - SMS/WhatsApp later?

---
