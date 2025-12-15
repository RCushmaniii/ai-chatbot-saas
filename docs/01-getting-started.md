# Getting Started

Welcome to the AI Chatbot SaaS documentation. This guide will help you set up and run the project locally.

## Overview

This is a production-ready, bilingual AI assistant platform with RAG (Retrieval Augmented Generation) to answer questions based on a custom knowledge base.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and **pnpm** installed
- **PostgreSQL database** with **pgvector** extension enabled
- **OpenAI API key** (for GPT-4o and embeddings)
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

Create a `.env.development.local` file in the root directory:

```bash
# Database - PostgreSQL with pgvector
POSTGRES_URL="postgresql://user:password@host:5432/database"

# OpenAI API
OPENAI_API_KEY="sk-proj-..."

# Authentication Secret (generate with: openssl rand -base64 32)
AUTH_SECRET="your-random-secret-key"
```

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

- **`/`** - Main chat interface
- **`/admin`** - Knowledge base management (requires authentication)
- **`/documentation`** - This documentation

## Next Steps

- [Learn about the RAG implementation](./02-rag-architecture.md)
- [Manage your knowledge base](./03-knowledge-base.md)
- [Understand the file upload system](./04-file-upload.md)
- [Customize system prompts](./05-customization.md)

## Troubleshooting

### Database Connection Issues

If you see `POSTGRES_URL is not defined`:

- Ensure `.env.development.local` exists in the root directory
- Check that the variable name is exactly `POSTGRES_URL`
- Restart your dev server after creating the file

### pgvector Extension Missing

If migrations fail with "extension pgvector does not exist":

```sql
-- Run this in your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;
```

### OpenAI API Errors

If you see authentication errors:

- Verify your `OPENAI_API_KEY` is correct
- Ensure you have credits in your OpenAI account
- Check that the key has access to GPT-4o and embedding models

## Support

For issues or questions, please refer to the [FAQ](./06-faq.md) or open an issue on GitHub.
