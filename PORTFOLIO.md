---
# =============================================================================
# PORTFOLIO.MD — Converso AI
# =============================================================================
portfolio_enabled: true
portfolio_priority: 1
portfolio_featured: true
portfolio_last_reviewed: "2026-02-22"

title: "Converso AI — Bilingual AI Front Desk & Sales Assistant"
tagline: "White-label AI chatbot SaaS for service businesses in bilingual markets"
slug: "converso-ai-chatbot-saas"

category: "AI Automation"
target_audience: "Service businesses needing 24/7 bilingual customer engagement without hiring staff"
tags:
  - "ai-chatbot"
  - "saas"
  - "rag"
  - "multi-tenant"
  - "bilingual"
  - "nextjs"
  - "stripe"
  - "pgvector"
  - "clerk-auth"
  - "lead-generation"

thumbnail: ""
hero_images: []
demo_video_url: ""

live_url: ""
demo_url: ""
case_study_url: ""

problem_solved: |
  Service businesses in bilingual markets lose leads outside business hours
  and can't afford round-the-clock bilingual staff. Generic chatbots hallucinate
  answers because they don't know the business. This platform gives each tenant
  a knowledge-grounded AI assistant that answers accurately in English or Spanish,
  qualifies leads, and hands off to humans when needed.

key_outcomes:
  - "Multi-tenant SaaS with full data isolation per business"
  - "RAG-powered answers grounded in verified business content"
  - "Native bilingual support with automatic language detection"
  - "Visual playbook builder for non-technical conversation design"
  - "Stripe billing with subscription management and usage tracking"
  - "One-tag embeddable widget for any website"

tech_stack:
  - "Next.js 16"
  - "TypeScript"
  - "PostgreSQL + pgvector"
  - "Vercel AI SDK"
  - "OpenAI GPT-4o"
  - "Clerk Authentication"
  - "Stripe Billing"
  - "Drizzle ORM"
  - "Tailwind CSS"
  - "React Flow"
  - "Vercel"

complexity: "Production"
---

## Overview

Converso AI is a multi-tenant SaaS platform that gives service businesses a bilingual AI front desk assistant. Each tenant uploads their own knowledge base — through file uploads, website scraping, or manual entry — and gets an AI chatbot that answers customer questions accurately in English or Spanish, qualifies leads, and routes high-intent conversations to live agents.

The platform targets businesses in bilingual markets (US-Mexico border, Latin America, multilingual metro areas) that can't justify hiring bilingual reception staff around the clock but lose leads by being unavailable. The AI assistant handles the initial conversation, captures contact information through scripted playbook flows, and escalates to a human when the situation warrants it.

The admin dashboard gives business owners full control over their chatbot without touching code: knowledge ingestion, conversation playbook design, lead management, live chat queues, and billing are all self-service.

## The Challenge

- **Lead leakage outside business hours:** Small service businesses miss 30-50% of inquiries that come in after hours or on weekends. No staff means no response means lost revenue.
- **Bilingual staffing costs:** Hiring bilingual receptionists is expensive and hard to scale. Auto-translation produces awkward, unnatural responses that erode trust.
- **Chatbot hallucination:** Generic AI chatbots make up answers when they don't know something. For a business, wrong information about pricing, services, or availability is worse than no answer at all.
- **Technical barrier to entry:** Most chatbot platforms require developer involvement for setup, knowledge base configuration, and conversation flow design. Small business owners don't have dev teams.

## The Solution

**Deterministic RAG for answer accuracy:**
The system retrieves relevant content from the tenant's knowledge base before the LLM call, injecting it directly into the system prompt. The model answers from verified facts, not training data. Source URLs are automatically cited in responses, and the system explicitly acknowledges when it doesn't have an answer rather than guessing.

**Native bilingual architecture:**
Language detection happens on the first message and persists throughout the conversation. System prompts, starter questions, and playbook messages all support dual-language configuration. This isn't auto-translate — it's language-native response generation.

**Self-service admin dashboard:**
Business owners manage everything through a web interface: upload PDFs and documents, scrape their website via sitemap, design conversation flows with a visual builder, manage leads with scoring and tagging, monitor live chat queues, and handle billing. No developer needed.

**Embeddable widget:**
A single script tag drops the chatbot into any website. Widget appearance, greeting message, and starter questions are configured from the admin panel. The widget communicates cross-origin with the platform API and requires no host-site code changes.

## Technical Highlights

- **Multi-tenant data isolation:** Every database query scopes to `businessId`. Knowledge chunks, conversations, contacts, settings, and billing records are fully isolated. RBAC enforces owner/admin/member permissions at the API layer.
- **HNSW vector indexes:** pgvector embedding columns use HNSW indexes for approximate nearest neighbor search, reducing similarity queries from O(n) to sub-linear time as knowledge bases grow.
- **Streaming chat architecture:** Vercel AI SDK streams tokens from OpenAI GPT-4o directly to the client, providing sub-second time-to-first-token and smooth message delivery.
- **Visual playbook builder:** Built on React Flow with 7 node types (message, question, options, condition, action, handoff, stop). Business owners design multi-step conversation flows with conditional branching and data capture.
- **Webhook-driven billing:** Stripe checkout, subscription lifecycle, and usage metering handled via cryptographically verified webhooks. Monthly usage aggregation tracks messages and knowledge base pages per tenant.
- **Security-first proxy layer:** Next.js 16's proxy.ts applies CSP, HSTS, and frame protection headers at the edge. All API routes enforce authentication and RBAC. Input validation via Zod schemas on every endpoint.

## Results

**For the End User / Business Owner:**
- 24/7 bilingual customer engagement without hiring staff
- Knowledge-grounded answers that don't hallucinate or give wrong information
- Lead capture and qualification running automatically while the business is closed
- Full chatbot configuration through a web dashboard — no developer dependency

**Technical Demonstration:**
- End-to-end SaaS architecture: multi-tenancy, RBAC, billing, usage metering
- Production RAG pipeline: ingestion, chunking, embedding, vector search, citation
- Real-time systems: streaming chat, live agent handoff, webhook event processing
- Full-stack TypeScript with type safety from database schema to API response to UI component

This project demonstrates the full scope of building a production SaaS product — not just the happy path, but the operational concerns that matter: tenant isolation, billing edge cases, security hardening, and making complex functionality accessible to non-technical users.
