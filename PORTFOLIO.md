---
# =============================================================================
# PORTFOLIO.MD — Converso AI
# =============================================================================
portfolio_enabled: true
portfolio_priority: 1
portfolio_featured: true
portfolio_last_reviewed: "2026-03-02"

title: "Converso AI — Bilingual AI Front Desk & Sales Assistant"
tagline: "Bilingual AI chatbot platform for service businesses — handles front desk and sales conversations 24/7"
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

thumbnail: "/images/portfolio/ai-chatbot-saas-thumb.webp"
hero_images:
  - src: "/images/portfolio/converso-01.webp"
    alt_en: "Converso AI dashboard showing the bilingual AI front desk assistant with a live customer conversation in progress."
    alt_es: "Panel de Converso AI que muestra el asistente de recepción con IA bilingüe con una conversación de cliente en curso."
  - src: "/images/portfolio/converso-02.webp"
    alt_en: "The embedded chat widget answering a customer question accurately in English, grounded in the business's own knowledge base."
    alt_es: "El widget de chat integrado responde con precisión la pregunta de un cliente en inglés, basándose en la base de conocimiento del propio negocio."
  - src: "/images/portfolio/converso-03.webp"
    alt_en: "The chat assistant responding to the same question in Spanish, demonstrating native bilingual language detection."
    alt_es: "El asistente de chat responde la misma pregunta en español, mostrando la detección de idioma bilingüe nativa."
  - src: "/images/portfolio/converso-04.webp"
    alt_en: "Knowledge base ingestion screen where a business owner uploads documents and scrapes their website to train the assistant."
    alt_es: "Pantalla de carga de la base de conocimiento donde el dueño del negocio sube documentos y rastrea su sitio web para entrenar al asistente."
  - src: "/images/portfolio/converso-05.webp"
    alt_en: "The visual playbook builder built on React Flow, with message, question, condition, and handoff nodes connected into a conversation flow."
    alt_es: "El constructor visual de guiones hecho con React Flow, con nodos de mensaje, pregunta, condición y transferencia conectados en un flujo de conversación."
  - src: "/images/portfolio/converso-06.webp"
    alt_en: "Lead management view showing captured contacts with scoring and tagging from automated conversations."
    alt_es: "Vista de gestión de prospectos que muestra los contactos capturados con calificación y etiquetas de las conversaciones automatizadas."
  - src: "/images/portfolio/converso-07.webp"
    alt_en: "Live chat queue where a human agent takes over a high-intent conversation handed off by the AI assistant."
    alt_es: "Cola de chat en vivo donde un agente humano retoma una conversación de alta intención transferida por el asistente con IA."
  - src: "/images/portfolio/converso-08.webp"
    alt_en: "Stripe billing and subscription management screen with usage tracking for messages and knowledge base pages per tenant."
    alt_es: "Pantalla de facturación y gestión de suscripciones con Stripe, con seguimiento de uso de mensajes y páginas de la base de conocimiento por cliente."
  - src: "/images/portfolio/converso-09.webp"
    alt_en: "The one-tag embeddable widget configured from the admin panel and dropped into a sample business website."
    alt_es: "El widget integrable de una sola etiqueta configurado desde el panel de administración e insertado en un sitio web de negocio de ejemplo."
demo_video_url: "/video/converso-brief.mp4"
demo_video_poster: "/video/converso-brief-poster.jpg"

live_url: ""
demo_url: ""
case_study_url: ""

problem_solved: |
  Service businesses in bilingual markets lose leads outside business hours
  and can't afford round-the-clock bilingual staff. Generic chatbots hallucinate
  answers because they don't know the business. This platform gives each tenant
  a knowledge-grounded AI assistant that answers accurately in English or Spanish,
  qualifies leads, and hands off to humans when needed.

solution: |
  A deterministic RAG pipeline retrieves verified content from each tenant's own
  knowledge base and injects it into the prompt, so answers are grounded in facts and
  cite their sources instead of hallucinating. Native bilingual generation detects the
  customer's language on the first message and responds naturally in English or Spanish —
  not auto-translation. A self-service admin dashboard lets non-technical owners ingest
  content, design conversation playbooks visually, manage leads, and handle billing,
  while a single embeddable script tag drops the assistant into any website.

key_outcomes:
  - "Multi-tenant SaaS with full data isolation per business"
  - "RAG-powered answers grounded in verified business content"
  - "Native bilingual support with automatic language detection"
  - "Visual playbook builder for non-technical conversation design"
  - "Stripe billing with subscription management and usage tracking"
  - "One-tag embeddable widget for any website"

metrics:
  - "24/7 bilingual lead capture — recovers the 30-50% of inquiries that arrive after hours"
  - "Knowledge-grounded answers with source citations — eliminates chatbot hallucination on pricing and services"
  - "Zero-developer setup — owners configure knowledge, playbooks, and billing entirely self-service"
  - "Sub-second time-to-first-token via streaming chat from GPT-4o"

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

# === REPO HEALTH STATUS ===
# Last audited: 2026-04-05
# Standards defined in: operating-system/delivery/repo-health-baseline.md
health_status:
  sentry: "Y"
  testing: "Y"
  ci_cd: "Y"
  health_endpoint: "Y"
  security_headers: "Y"
  rate_limiting: "Y"
  env_validation: "Y"
  analytics: "DEFERRED"
  structured_logging: "-"
  dependabot: "Y"
  secret_scanning: "Y"
  db_backup: "-"
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
