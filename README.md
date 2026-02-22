# Converso AI — Bilingual AI Front Desk & Sales Assistant

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?logo=postgresql)
![Vercel AI SDK](https://img.shields.io/badge/AI_SDK-5.0-black?logo=vercel)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk)
![Stripe](https://img.shields.io/badge/Billing-Stripe-635BFF?logo=stripe)

> Multi-tenant SaaS platform for service businesses to deploy a bilingual (EN/ES), on-brand AI assistant that answers questions, qualifies leads, captures booking intent, and escalates high-intent prospects to live agents.

## Overview

Converso AI is a white-label chatbot platform built for service businesses that operate in bilingual markets. Each tenant gets a fully customizable AI assistant backed by their own knowledge base, with automatic language detection and seamless handoff to human agents when conversations require a personal touch.

The platform combines retrieval-augmented generation (RAG) with a visual playbook builder, giving non-technical business owners the tools to script complex conversational flows without writing code. An embeddable widget drops into any website with a single script tag.

The admin dashboard provides full control over knowledge ingestion, lead management, live chat queues, and billing — all tenant-isolated with role-based access control.

## The Challenge

Service businesses in bilingual markets face a common problem: they lose leads outside business hours, can't staff bilingual receptionists around the clock, and generic chatbots give wrong answers because they don't know the business.

Existing solutions either require technical expertise to configure, lack real bilingual support (auto-translate is not the same as native language understanding), or charge enterprise prices that small businesses can't justify.

The platform needed to solve three things simultaneously:
- **Knowledge accuracy** — answers must come from verified business content, not hallucinations
- **Language fluency** — natural responses in both English and Spanish without translation artifacts
- **Operational simplicity** — a business owner, not a developer, configures and manages everything

## The Solution

**Deterministic RAG architecture** ensures every answer traces back to uploaded content. The system retrieves relevant knowledge chunks before the LLM call and injects them into the system prompt, so the model answers from facts rather than imagination. Source URLs are automatically attributed in responses.

**Native bilingual design** detects the user's language from their first message and maintains that language throughout the conversation. System prompts, starter questions, and playbook flows all support dual-language configuration.

**Self-service admin dashboard** provides a single interface for knowledge management (file uploads, website scraping, manual entry), conversation playbook design (visual flow builder), lead tracking with scoring, live chat handoff queues, and Stripe-powered billing.

**Embeddable widget** deploys with one script tag. Widget appearance, behavior, and starter questions are configured from the admin panel — no code changes needed on the host site.

## Technical Highlights

- **Multi-tenant isolation** — every database query scopes to `businessId`; knowledge, conversations, settings, and billing are fully isolated between tenants
- **HNSW vector indexes** on pgvector embedding columns for sub-linear similarity search across knowledge bases
- **Streaming responses** via Vercel AI SDK with real-time token delivery to the chat UI
- **RBAC with Clerk** — owner/admin/member roles enforced at the API route level via `requirePermission()` middleware
- **Visual playbook builder** using React Flow — business owners design multi-step conversation flows with conditional branching, data capture, and live agent handoff
- **Webhook-driven billing** — Stripe checkout sessions, subscription lifecycle events, and usage tracking all handled via verified webhooks
- **Security headers in proxy.ts** — CSP, HSTS, X-Frame-Options applied at the edge via Next.js 16's proxy layer (replaces middleware.ts)

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9.12
- PostgreSQL database with pgvector extension enabled
- OpenAI API key
- Clerk account (publishable + secret keys)
- Stripe account (for billing features)

### Installation

```powershell
# Clone and install
git clone https://github.com/RCushmaniii/ai-chatbot-saas.git
cd ai-chatbot-saas
pnpm install

# Run database migrations
pnpm db:migrate

# Seed pricing plans
pnpm seed:plans

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env.local` file at the project root:

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | PostgreSQL connection string with pgvector |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o and embeddings |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g., `https://yourdomain.com`) |

## Security

- [x] Clerk authentication with session management
- [x] RBAC: owner/admin/member roles enforced on every admin API route
- [x] Parameterized SQL queries throughout (Drizzle ORM + postgres.js template literals)
- [x] Stripe and Clerk webhook signature verification
- [x] Security headers via proxy.ts (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [x] PDF upload validation (magic bytes + file size limits)
- [x] Multi-tenant data isolation via `businessId` scoping on all queries
- [x] Zod schema validation on all API request bodies
- [x] CSV formula injection sanitization on contact exports
- [x] Rate limiting on embed chat endpoints (per-IP)

## Project Structure

```
ai-chatbot-saas/
├── app/
│   ├── (auth)/                 # Clerk sign-in/sign-up routes
│   ├── (chat)/                 # Chat UI, admin dashboard, chat API
│   │   ├── api/chat/           # Streaming chat endpoint
│   │   └── admin/              # Admin panel page
│   ├── api/
│   │   ├── admin/              # 15+ admin CRUD endpoints
│   │   ├── embed/              # Widget embed endpoints
│   │   ├── stripe/             # Checkout + portal
│   │   ├── webhooks/           # Stripe webhook handler
│   │   └── clerk/              # Clerk webhook handler
│   └── embed/chat/             # Embeddable widget page
├── components/                 # 99 React components
│   ├── admin-*/                # Admin panel modules
│   ├── elements/               # Chat message primitives
│   └── ui/                     # shadcn/ui component library
├── lib/
│   ├── ai/                     # Models, prompts, providers, tools
│   ├── db/                     # Drizzle schema, queries, migrations
│   ├── i18n/                   # Translations and language hooks
│   ├── ingestion/              # CSV and DOCX processors
│   └── playbook/               # Playbook execution engine
├── migrations/                 # Custom SQL migrations
├── scripts/                    # Seed, ingest, and maintenance scripts
└── docs/                       # Architecture and planning docs
```

## Deployment

The app deploys to Vercel. The build command runs migrations before building:

```powershell
pnpm build:migrate
```

Ensure all environment variables are configured in the Vercel dashboard. The Stripe and Clerk webhooks must point to your production URL.

## Results

This platform demonstrates end-to-end SaaS product architecture — from multi-tenant data isolation and role-based access control to Stripe billing integration and embeddable widget distribution.

| Capability | Implementation |
|------------|---------------|
| Knowledge ingestion | Website scraping, PDF/DOCX/CSV upload, manual entry |
| Vector search | pgvector with HNSW indexes, cosine similarity |
| Conversation flows | Visual playbook builder with 7 node types |
| Lead management | Contact scoring, activity tracking, CSV import/export |
| Live chat | Agent queue with priority routing and AI summaries |
| Billing | Stripe subscriptions with usage-based metering |
| Widget | One-tag embed with configurable appearance |

## Contact

**Robert Cushman**
Business Solution Architect & Full-Stack Developer
Guadalajara, Mexico

info@cushlabs.ai
[GitHub](https://github.com/RCushmaniii) | [LinkedIn](https://linkedin.com/in/robertcushman) | [Portfolio](https://cushlabs.ai)

## License

(c) 2025 Robert Cushman. All rights reserved. See `LICENSE`.

---

*Last Updated: 2026-02-22*
