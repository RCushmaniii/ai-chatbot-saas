---
# PRD — Bilingual AI Front Desk & Sales Assistant (Multi‑Tenant SaaS)

This PRD defines the **v1 product** for a production-ready SaaS platform that enables service businesses in bilingual English–Spanish markets to deploy an on-brand AI assistant that answers questions, qualifies leads, books appointments, and escalates high-intent prospects to humans.

This PRD is **aligned with**:

- `docs/BLUEPRINT.MD`
- `docs/FORMAL_PLAN.md`

---

## 1) Product summary

### 1.1 One-sentence definition

A multi-tenant SaaS platform that lets service businesses deploy a bilingual (EN/ES), on-brand AI assistant to **answer, qualify, book, and hand off leads**—with admin visibility into conversations, outcomes, and knowledge gaps.

### 1.2 Target customer

Service businesses operating in bilingual English–Spanish environments, including (examples):

- Home services (HVAC, plumbing, electrical)
- Clinics (dental, therapy, chiropractic)
- Professional services (legal, accounting)

### 1.3 Primary value outcomes

- Capture leads 24/7 without hiring bilingual staff
- Reduce repetitive customer support load
- Increase booked appointments
- Improve speed-to-lead with structured handoffs

---

## 2) Goals, non-goals, and success metrics

### 2.1 Goals (v1)

- Deploy a tenant bot + embed within one onboarding session.
- Provide accurate, grounded answers from tenant-owned knowledge.
- Qualify leads with a structured intake and assign `cold | warm | hot`.
- Enable appointment booking (MVP) and/or capture scheduling intent.
- Route hot leads to humans with a complete handoff packet.
- Provide admin dashboard for:
  - conversations
  - lead outcomes
  - booking outcomes
  - RAG gaps (missed questions / low-context)

### 2.2 Non-goals (v1)

- No marketplace/agent store.
- No custom model fine-tuning.
- No omnichannel (SMS/WhatsApp/voice) beyond optional notifications.
- No deep CRM orchestration (only minimal “hooks” / export / webhook).

### 2.3 Success metrics (v1)

**Activation & setup**

- % tenants completing onboarding (bot created + embed installed + knowledge ingested)
- Median time-to-first-successful chat

**Revenue outcomes**

- Lead capture rate: chat sessions → leads created
- Qualification rate: leads created → warm/hot
- Booking rate: warm/hot → booked

**Quality**

- Answer quality feedback rate (thumbs down, “wrong answer” reports)
- RAG coverage score (see Admin: “missed questions”)

**Efficiency & unit economics**

- Cost per conversation
- Cost per qualified lead

---

## 3) Personas and key user journeys

### 3.1 Personas

- **Business Owner / Admin**
  - Needs: brand control, lead funnel visibility, easy setup, ROI.
- **Staff / Sales**
  - Needs: high-quality handoffs, context-rich summaries, fewer low-intent leads.
- **Website Visitor**
  - Needs: fast answers, bilingual support, trust, frictionless booking.

### 3.2 Key journeys

1. **Setup + launch**
   - Create business → create bot → configure handoff + booking → ingest knowledge → install embed.
2. **FAQ → lead capture**
   - Visitor asks questions → assistant answers grounded → prompts for contact when intent is commercial.
3. **Qualification**
   - Assistant performs short intake → assigns `cold/warm/hot` → stores structured lead.
4. **Booking**
   - Assistant offers times / directs to booking flow → confirms appointment.
5. **Hot lead handoff**
   - Assistant collects contact + preferences → creates handoff packet → notifies staff.

---

## 4) Functional requirements

### 4.1 Tenancy and access control

- **Multi-tenant**: each business is an isolated tenant.
- Tenants have:
  - users (members)
  - bots
  - knowledge
  - conversations
  - leads
  - settings
- Roles:
  - `owner`, `admin`, `member` (minimum)
- All APIs must enforce tenant scoping at the query boundary.

### 4.2 Chat experience (web app + embed)

- Web chat for logged-in tenant users.
- Public embed widget for visitors.
- Support:
  - streaming responses (preferred)
  - markdown rendering
  - citations/sources where relevant

### 4.3 Bilingual behavior (non-negotiable)

- Detect language **per message** (EN/ES).
- Respond in the same language.
- Responses must be **native**, not literal translation.
- UI labels must support `en` + `es`.

### 4.4 Brand voice learning

From tenant-provided content, infer:

- formality
- sentence length
- vocabulary complexity
- emotional tone

Store a **Brand Voice Profile** and apply it:

- to system prompt modifiers
- consistently across languages (tone parity)

### 4.5 Knowledge ingestion

Supported sources:

- Website ingestion (sitemap / URL list)
- Single URL ingestion
- PDF upload
- Text input

Required ingestion features:

- content cleaning
- chunking
- embeddings
- tenant-scoped storage
- metadata capture (url/title/language/updatedAt/source)
- ingestion status and error reporting

### 4.6 Retrieval (RAG)

- Tenant-scoped retrieval only.
- Deterministic retrieval for core answers.
- Store retrieval events for observability.
- Support:
  - “no context found” handling
  - citations (URLs / documents)

### 4.7 Lead qualification

- The assistant must detect commercial intent and run an intake flow.
- Output (stored in DB):
  - lead score: `cold | warm | hot`
  - captured fields (minimum):
    - contact name
    - contact method(s)
    - service requested
    - location/zip (if relevant)
    - urgency/timeline
    - notes
  - conversation summary for staff

### 4.8 Appointment scheduling (MVP)

- v1 must support one of:
  - direct integration with a scheduling provider (recommended)
  - or a controlled “booking intent capture” flow that hands off to humans

Required behaviors:

- confirm timezone
- confirm contact info
- persist booking intent/outcome

### 4.9 Human handoff

- Trigger on:
  - hot lead
  - explicit “talk to a human” request
  - unsafe / uncertain response situations
- Handoff packet must include:
  - contact info
  - lead score and fields
  - transcript
  - summary
  - recommended next step

### 4.10 Admin dashboard (tenant admin)

Required areas:

- Onboarding/setup checklist
- Bot settings + embed settings
- Knowledge management (sources, ingest status)
- Conversations browser + search
- Leads view + filters
- Booking outcomes
- RAG insights:
  - missed questions
  - low-context events
  - source usage
- Usage/cost controls (plan-based)

### 4.11 Billing and entitlements

- Plan tiers aligned to Blueprint:
  - Tier 1: self-service
  - Tier 2: advanced
  - Tier 3: white-glove
- Enforce quotas (examples):
  - monthly conversations
  - monthly messages/tokens
  - knowledge sources / storage
  - number of bots
- Ability to upgrade/downgrade and view usage.

---

## 5) AI behavior requirements

### 5.1 Safety and grounding

- Must not fabricate business facts.
- If retrieval confidence is low, the assistant must:
  - ask a clarifying question, or
  - escalate to human handoff, depending on intent.

### 5.2 Prompt injection defenses

- Strip/ignore instructions embedded in retrieved content.
- Treat retrieved content as data.
- Prefer allowlisted tools/actions.

### 5.3 Model routing policy (v1)

- Cheap/fast model:
  - intent detection
  - language detection (if LLM-based)
  - classification (lead scoring)
- Mid-tier model:
  - normal responses
- Premium model:
  - sales-critical moments only

---

## 6) Non-functional requirements

### 6.1 Performance

- Fast first response and fast streaming.
- Retrieval latency targets must be measurable.

### 6.2 Reliability

- Retries and graceful errors for ingestion, embeddings, and AI calls.
- Background jobs should be resumable.

### 6.3 Security & compliance

Must include:

- tenant isolation
- encrypted storage
- scoped keys
- rate limiting
- audit logs
- GDPR-ready deletion

### 6.4 Accessibility and internationalization

- Basic accessibility compliance.
- All user-facing strings support `en` + `es`.

---

## 7) Analytics and observability (v1)

Track:

- conversation counts
- lead funnel metrics (cold/warm/hot)
- booking outcomes
- RAG events:
  - no-context
  - low-confidence
  - top sources
- cost metrics (at least aggregated per tenant)

---

## 8) Risks and mitigations

- **Tenant isolation errors** → enforce via strict query patterns + tests.
- **Hallucinations** → deterministic retrieval + escalation rules.
- **Cost overruns** → routing + quotas + caching + premium gating.
- **Scheduling complexity** → start with one provider + clear fallback.

---

## 9) Launch readiness (Definition of Done)

A tenant can go live when:

- they can create a bot and install the embed
- ingestion works for at least website + PDF + text
- answers are grounded with citations
- lead qualification stores structured leads
- handoff packet is generated and delivered
- bilingual behavior works end-to-end
- tenant isolation tests pass

---
