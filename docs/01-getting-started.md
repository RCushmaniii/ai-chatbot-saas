# Getting Started

Welcome to **Converso** - the bilingual AI chatbot SaaS platform. This guide will help you set up and run the project locally.

## Overview

Converso is a production-ready, bilingual AI assistant platform with RAG (Retrieval Augmented Generation) to answer questions based on a custom knowledge base.

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database:** Neon (serverless PostgreSQL with pgvector)
- **ORM:** Drizzle
- **Auth:** Clerk
- **Payments:** Stripe
- **AI:** OpenAI (GPT-4o + embeddings)

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and **pnpm** installed
- **Neon account** - https://neon.tech (free tier available)
- **Clerk account** - https://clerk.com (free tier available)
- **OpenAI API key** - https://platform.openai.com
- **Stripe account** (optional for payments) - https://stripe.com
- Basic knowledge of Next.js and React

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-chatbot-saas
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# ===========================================
# DATABASE (Neon)
# ===========================================
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# ===========================================
# AUTHENTICATION (Clerk)
# ===========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Clerk routing
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# ===========================================
# OPENAI
# ===========================================
OPENAI_API_KEY="sk-..."

# ===========================================
# STRIPE (optional)
# ===========================================
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# ===========================================
# APPLICATION
# ===========================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Where to Get Each Key

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon Console → Project → Connection Details (use pooled connection) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → Create endpoint pointing to `/api/clerk/webhook` |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `STRIPE_*` | https://dashboard.stripe.com/apikeys |

### 4. Setup Database

Run migrations to create the necessary tables:

```bash
pnpm db:migrate
```

This will:

- Create the `User`, `Chat`, `Message`, and `Document_Knowledge` tables
- Enable the pgvector extension
- Set up vector similarity search capabilities

### 5. Populate Knowledge Base (Optional)

Seed the database with initial business content:

```bash
npx tsx scripts/populate-knowledge.ts
```

This adds:

- Service descriptions
- Target audience information
- Pricing details
- FAQs
- Business contact information

### 6. Start Development Server

```bash
pnpm dev
```

Your application will be available at [http://localhost:3000](http://localhost:3000).

## Key Routes

Once running, you can access:

**Public:**
- **`/`** - Landing page
- **`/pricing`** - Pricing page
- **`/demo`** - Widget demo
- **`/sign-in`** - Clerk sign in (authentication)
- **`/sign-up`** - Clerk sign up (registration)

**Protected (requires authentication):**
- **`/dashboard`** - Main dashboard
- **`/chat/[id]`** - Chat interface
- **`/settings`** - Account settings
- **`/settings/knowledge`** - Knowledge base management
- **`/settings/embed`** - Embed code generator

## Next Steps

- [Learn about the RAG implementation](./02-rag-architecture.md)
- [Manage your knowledge base](./03-knowledge-base.md)
- [Understand the file upload system](./04-file-upload.md)
- [Customize system prompts](./05-customization.md)

## Troubleshooting

### Database Connection Issues

If you see `DATABASE_URL is not defined`:

- Ensure `.env.local` exists in the root directory
- Check that the variable name is exactly `DATABASE_URL`
- Restart your dev server after creating the file

**Neon-specific:**
- Use the **pooled connection string** for serverless environments
- Ensure `?sslmode=require` is appended to the URL

### pgvector Extension Missing

If migrations fail with "extension pgvector does not exist":

Neon includes pgvector by default. If using another provider:
```sql
-- Run this in your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;
```

### Clerk Authentication Issues

If you see "Clerk: publishableKey is missing":
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_test_` or `pk_live_`
- Check that the key is in `.env.local` (not `.env`)

If webhooks aren't syncing users:
- Verify `CLERK_WEBHOOK_SECRET` matches your Clerk Dashboard webhook
- Ensure webhook endpoint is `/api/clerk/webhook`
- Check Clerk Dashboard → Webhooks for delivery logs

### OpenAI API Errors

If you see authentication errors:

- Verify your `OPENAI_API_KEY` is correct
- Ensure you have credits in your OpenAI account
- Check that the key has access to GPT-4o and embedding models

### Stripe Webhook Issues (if using payments)

For local development:
```bash
# Install Stripe CLI and forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Support

For issues or questions, please refer to the [FAQ](./06-faq.md) or open an issue on GitHub.
