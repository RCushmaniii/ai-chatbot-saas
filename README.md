<h1 align="center">AI Chatbot SaaS</h1>

<p align="center">
    <strong>Ragbot by CushLabs.AI</strong> - Multi-tenant AI chatbot platform with RAG (Retrieval Augmented Generation) capabilities. Built for serving multiple customers with isolated knowledge bases.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#admin-dashboard"><strong>Admin Dashboard</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#rag-knowledge-base"><strong>RAG & Knowledge Base</strong></a> ·
  <a href="#running-locally"><strong>Running Locally</strong></a> ·
  <a href="#white-label-deployment"><strong>White-Label Guide</strong></a>
</p>
<br/>

## Features

### Core Capabilities

- **🌐 Bilingual Support** - Automatically responds in English or Spanish based on user input
- **🧠 RAG (Retrieval Augmented Generation)** - Answers questions using business-specific knowledge base
- **📁 Multi-Source Knowledge Base** - Upload files, scrape websites, or add manual content
- **🎯 Deterministic RAG** - Server-side context injection for reliable, accurate responses
- **💬 Real-time Chat** - Streaming responses with AI SDK
- **📚 Persistent Chat History** - Save and retrieve conversation history
- **🔗 Source Attribution** - Automatically includes URLs in responses for transparency
- **⚡ Starter Questions** - Customizable suggested prompts to guide users

### Technical Features

- [Next.js 15](https://nextjs.org) with App Router and Turbopack
  - React Server Components (RSCs) and Server Actions
  - Edge and Node.js runtime support
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Direct OpenAI integration (GPT-4o, text-embedding-3-small)
  - Streaming text generation
  - Tool calling support
- [shadcn/ui](https://ui.shadcn.com)
  - Modern UI components with [Tailwind CSS](https://tailwindcss.com)
  - Accessible primitives from [Radix UI](https://radix-ui.com)
- **Vector Database**
  - PostgreSQL with pgvector extension
  - Semantic search for knowledge retrieval
  - Automatic text chunking and embedding
- [Auth.js](https://authjs.dev)
  - Secure authentication with NextAuth
- **PDF Processing**
  - Dual-parser strategy (unpdf + pdf-parse)
  - Robust error handling and validation

## Admin Dashboard

The `/admin` route provides a comprehensive dashboard for managing your chatbot:

### 📋 Manual Content

- Upload `.txt`, `.md`, and `.pdf` files
- Add content manually via textarea
- Categorize by type (Services, Pricing, FAQ, etc.)
- Support for English and Spanish content

### 🌐 Website Scraping

- **Automatic sitemap scraping** - Index entire websites automatically
- **Knowledge base stats** - View counts for website vs manual content
- **One-click ingestion** - Run `pnpm run ingest` from the UI
- **Clear data** - Reset website content when needed
- Uses Cheerio for robust HTML parsing
- Processes 48+ pages into 193+ searchable chunks

### ⚙️ Bot Settings (Starter Questions)

- **Add/Edit/Delete** suggested questions
- **Emoji support** for visual appeal
- **Drag-and-drop** ordering (coming soon)
- **Live preview** of how questions appear to users
- **Bilingual questions** - Mix English and Spanish prompts

### 💬 Instructions (System Prompts)

- **Bot name** customization
- **Custom system instructions** - Define personality and behavior
- **Risk-averse templates** - Pre-built cautious response patterns
- **Reset to default** - Restore original instructions
- Instructions guide:
  - Language matching rules
  - Knowledge scope boundaries
  - Cautious language patterns
  - Missing information handling
  - URL attribution requirements

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **AI/ML:** OpenAI (GPT-4o, text-embedding-3-small)
- **Database:** PostgreSQL with pgvector
- **ORM:** Drizzle ORM
- **Authentication:** Auth.js (NextAuth)
- **UI:** React 19, Tailwind CSS, shadcn/ui
- **PDF Processing:** unpdf, pdf-parse
- **Deployment:** Vercel

## RAG Knowledge Base

This chatbot uses a **dual-table RAG implementation** with:

### Architecture

1. **Two Knowledge Tables:**
   - `website_content` - Automatically scraped from sitemap (193 chunks from 48 pages)
   - `Document_Knowledge` - Manually uploaded files and text
2. **Search Priority:**

   - Searches `website_content` first (0.5 similarity threshold)
   - Falls back to `Document_Knowledge` if no results (0.6 similarity threshold)

3. **Vector Database** - PostgreSQL with pgvector extension
   - Cosine similarity search
   - IVFFlat indexes for performance
4. **Embeddings** - OpenAI `text-embedding-3-small` (1536 dimensions)

5. **Deterministic RAG** - Server-side context injection

   - Knowledge retrieved before LLM call
   - Results injected into system prompt
   - URLs automatically included in responses

6. **Automatic Chunking:**
   - Website content: 1000 characters with 200 overlap
   - Manual content: 1500 characters with paragraph-aware splitting

### Ingestion Pipeline

The `scripts/ingest.ts` script:

- Fetches and parses XML sitemaps
- Filters URLs by pattern (e.g., only `/en/` pages)
- Scrapes HTML with Cheerio
- Extracts clean text content
- Splits into chunks
- Generates embeddings
- Stores in `website_content` table
- **Idempotent** - Truncates table before re-ingestion

### Knowledge Base Content Types

- **Services** - English coaching offerings
- **Target Audience** - Professional demographics
- **Pricing** - Session rates and packages
- **FAQs** - Common questions
- **Blog Posts** - Educational content
- **Testimonials** - Client reviews
- **Business Info** - Contact details, booking URL

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/nextjs-ai-chatbot)

## Running Locally

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database with pgvector extension
- OpenAI API key

### Environment Variables

Create a `.env.development.local` file with:

```bash
# Database
POSTGRES_URL="postgresql://user:password@host:5432/database"

# OpenAI
OPENAI_API_KEY="sk-..."

# Auth (generate with: openssl rand -base64 32)
AUTH_SECRET="your-secret-key"
```

### Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Setup database:**

   ```bash
   pnpm db:migrate
   ```

3. **Populate knowledge base (optional):**

   ```bash
   npx tsx scripts/populate-knowledge.ts
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

Your app should now be running on [localhost:3000](http://localhost:3000).

### Key Routes

- `/` - Main chat interface
- `/admin` - Knowledge base management (requires authentication)
- `/documentation` - Project documentation

## Project Structure

```
ny-ai-chatbot/
├── app/
│   ├── (auth)/              # Authentication routes
│   ├── (chat)/              # Chat interface and API
│   │   ├── api/chat/        # Chat API endpoint
│   │   └── admin/           # Admin panel
│   └── api/
│       └── admin/knowledge/ # Knowledge base API
├── components/              # React components
│   ├── admin-knowledge-base.tsx
│   ├── chat.tsx
│   └── ...
├── lib/
│   ├── ai/                  # AI configuration
│   │   ├── prompts.ts       # System prompts
│   │   ├── providers.ts     # OpenAI setup
│   │   └── tools/           # RAG search tool
│   └── db/                  # Database
│       ├── schema.ts        # Drizzle schema
│       └── migrate.ts       # Migration script
├── docs/                    # Documentation
└── scripts/
    └── populate-knowledge.ts # Seed script
```

## White-Label Deployment

This chatbot is designed for easy white-label deployment. Follow these steps to customize for your business:

### 1. Database Setup

Run the migration SQL in your Vercel Postgres SQL Editor:

```sql
-- See migrations/create_bot_settings.sql
CREATE TABLE IF NOT EXISTS bot_settings (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "botName" VARCHAR(100),
  "customInstructions" TEXT,
  "starterQuestions" JSONB,
  colors JSONB,
  settings JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2. Customize via Admin Dashboard

Navigate to `/admin` and configure:

1. **Instructions Tab:**

   - Set your bot name
   - Write custom system instructions
   - Define personality and tone
   - Set knowledge scope and boundaries

2. **Bot Settings Tab:**

   - Add starter questions in your language(s)
   - Include emojis for visual appeal
   - Preview how they'll appear

3. **Website Scraping Tab:**

   - Enter your sitemap URL
   - Click "Run Ingestion"
   - Monitor progress and stats

4. **Manual Content Tab:**
   - Upload PDFs, TXT, MD files
   - Add content via textarea
   - Categorize by type

### 3. Update Environment Variables

```bash
# Required
OPENAI_API_KEY="sk-..."
POSTGRES_URL="postgresql://..."
AUTH_SECRET="..." # Generate with: openssl rand -base64 32

# Optional
NEXT_PUBLIC_APP_NAME="Your Business Name"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### 4. Customize Branding

Edit `lib/ai/prompts.ts` to update:

- Business name and description
- Services offered
- Target audience
- Pricing information
- Contact/booking URLs

### 5. Deploy to Vercel

```bash
# Push to GitHub
git push origin main

# Deploy via Vercel CLI or dashboard
vercel --prod
```

### 6. Post-Deployment

1. Create an admin user account
2. Log in to `/admin`
3. Configure all settings
4. Run website ingestion
5. Test the chatbot thoroughly
6. Monitor usage and refine prompts

## Documentation

For detailed documentation, see:

- [Admin User Guide](./docs/ADMIN_GUIDE.md)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## License

MIT
