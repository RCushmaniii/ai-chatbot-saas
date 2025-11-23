# Frequently Asked Questions

Common questions and answers about the NY English Teacher AI Chatbot.

## General

### What is this chatbot?

An intelligent, bilingual AI chatbot built for New York English Teacher business. It uses RAG (Retrieval Augmented Generation) to answer questions based on a custom knowledge base.

### What languages does it support?

Currently English and Spanish. The chatbot automatically detects the user's language and responds accordingly.

### Can I use this for my own business?

Yes! The codebase is open-source and can be customized for any business. See the [Customization Guide](./05-customization.md).

## Setup & Installation

### What are the system requirements?

- Node.js 18+
- pnpm package manager
- PostgreSQL database with pgvector extension
- OpenAI API key

### How do I get a PostgreSQL database with pgvector?

**Option 1: Neon (Recommended)**

- Sign up at [neon.tech](https://neon.tech)
- Create a new project
- pgvector is included by default

**Option 2: Local PostgreSQL**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Option 3: Supabase**

- Sign up at [supabase.com](https://supabase.com)
- Enable pgvector extension in SQL editor

### How much does it cost to run?

**OpenAI API costs:**

- GPT-4o: ~$0.005 per message (varies by length)
- Embeddings: ~$0.0001 per 1000 tokens
- Typical monthly cost: $10-50 depending on usage

**Database:**

- Neon: Free tier available, $19/month for production
- Supabase: Free tier available, $25/month for production

**Hosting:**

- Vercel: Free for hobby projects, $20/month for production

### Why am I getting "POSTGRES_URL is not defined"?

1. Ensure `.env.development.local` exists in root directory
2. Check the variable name is exactly `POSTGRES_URL`
3. Restart your dev server after creating the file

### How do I enable pgvector?

Run this SQL in your PostgreSQL database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Or use the populate script which does this automatically:

```bash
npx tsx scripts/populate-knowledge.ts
```

## RAG & Knowledge Base

### What is RAG?

Retrieval Augmented Generation - a technique where the AI retrieves relevant information from a knowledge base before generating responses. This ensures accurate, business-specific answers.

### How does the knowledge base work?

1. Documents are split into ~1500 character chunks
2. Each chunk is converted to a vector embedding
3. User queries are also converted to embeddings
4. Similar chunks are retrieved using vector search
5. Retrieved chunks are injected into the AI's context
6. AI generates response using this context

### Why deterministic RAG instead of tool-based?

**Deterministic (our approach):**

- ✅ Always includes relevant context
- ✅ Single LLM call (faster)
- ✅ Predictable behavior
- ✅ Easy to debug

**Tool-based:**

- ⚠️ Model may not call the tool
- ⚠️ Multiple round-trips (slower)
- ⚠️ Unpredictable behavior
- ⚠️ Complex debugging

### How many documents can I store?

Theoretically unlimited, but practical limits:

- **Free tier databases:** ~10,000 chunks
- **Paid databases:** 100,000+ chunks
- **Performance:** Search stays fast up to 1M+ chunks with proper indexing

### Can I delete old content?

Yes! Use the admin panel at `/admin` or the API:

```typescript
DELETE /api/admin/knowledge?id=123
```

## File Upload

### What file types are supported?

- `.txt` - Plain text files
- `.md` - Markdown files
- `.pdf` - PDF documents

### Why does my PDF upload fail?

Common reasons:

1. **Scanned images** - PDF contains only images (needs OCR)
2. **Password-protected** - Remove password first
3. **Corrupted file** - Try re-downloading or re-creating
4. **Too large** - Files >10MB may timeout

### How do I upload scanned PDFs?

Scanned PDFs contain images, not text. You need to:

1. Use OCR software (Adobe Acrobat, online tools)
2. Export as text-based PDF
3. Upload the OCR'd version

### Can I upload multiple files at once?

Yes! Select multiple files in the file picker or drag and drop multiple files.

### What happens if I upload the same file twice?

It will create duplicate entries. Delete the old one first to avoid duplicates.

## Errors & Troubleshooting

### "pdfParse is not a function"

This was a CommonJS module import issue. It's been fixed in the latest version. If you still see it:

1. Pull latest code
2. Run `pnpm install`
3. Restart dev server

### "No text content found in PDF"

Your PDF likely contains only scanned images. Use OCR software to convert it to a text-based PDF first.

### "Failed to load resource: 500 Internal Server Error"

Check your terminal for detailed error messages. Common causes:

1. Database connection issues
2. OpenAI API key invalid or no credits
3. Missing environment variables

### Chatbot not using knowledge base

1. **Check if content exists:** Visit `/admin` and verify documents are there
2. **Test similarity:** Your query may not match any content (try more specific questions)
3. **Check logs:** Look for `[RAG]` messages in terminal
4. **Verify embeddings:** Ensure embeddings were generated (check database)

### Responses are in the wrong language

The chatbot responds in the user's language. If it's wrong:

1. Check your knowledge base has content in that language
2. Verify the `language` metadata is set correctly
3. Try asking in a different language

## Performance

### How fast are responses?

- **First token:** ~500ms (includes RAG search)
- **Streaming:** ~50 tokens/second
- **Total:** 2-5 seconds for typical response

### Can I make it faster?

1. **Use GPT-3.5** instead of GPT-4o (cheaper, faster)
2. **Reduce RAG chunks** from 3 to 2
3. **Cache embeddings** (already done)
4. **Use edge runtime** for chat API (already done)

### Why is PDF upload slow?

PDF processing involves:

1. File upload (~1-2s for 1MB)
2. Text extraction (~2-5s)
3. Chunking (~1s)
4. Embedding generation (~1s per chunk)
5. Database insertion (~1s)

Total: 5-15 seconds for typical PDF.

## Customization

### How do I change the chatbot's personality?

Edit `lib/ai/prompts.ts`:

```typescript
export const regularPrompt = `
You are a [friendly/professional/technical] assistant...
`;
```

### Can I add more languages?

Yes! Add translated content to the knowledge base with the appropriate `language` metadata:

```typescript
{ content: "...", metadata: { language: "fr" } }
```

### How do I change the booking URL?

Edit `lib/ai/prompts.ts`:

```typescript
const BOOKING_URL = "https://your-business.com/book";
```

### Can I use a different AI model?

Yes! Edit `lib/ai/providers.ts`:

```typescript
export const myProvider = {
  chat: openai("gpt-3.5-turbo"), // or any other model
};
```

## Deployment

### How do I deploy to production?

**Vercel (Recommended):**

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Other platforms:**

- Ensure Node.js 18+ runtime
- Set `NODE_ENV=production`
- Configure environment variables
- Run `pnpm build && pnpm start`

### Do I need to migrate the database for production?

Yes! Run migrations before deploying:

```bash
pnpm db:migrate
```

Or set up automatic migrations in your deployment pipeline.

### How do I backup the knowledge base?

**PostgreSQL dump:**

```bash
pg_dump -t Document_Knowledge $POSTGRES_URL > backup.sql
```

**Via API:**

```bash
curl http://localhost:3000/api/admin/knowledge > backup.json
```

## Security

### Is the admin panel secure?

Yes, it requires authentication via Auth.js. Only authenticated users can access `/admin`.

### Can users see the knowledge base?

No, the knowledge base is not directly accessible. Users only see responses generated by the AI using retrieved context.

### How do I add more admin users?

Configure Auth.js providers in `app/(auth)/auth.ts`. By default, it uses email/password authentication.

### Is my data encrypted?

- **In transit:** Yes (HTTPS)
- **At rest:** Depends on your database provider (Neon, Supabase encrypt by default)
- **API keys:** Stored in environment variables (not in code)

## Support

### Where can I get help?

1. Check this FAQ
2. Read the [documentation](./01-getting-started.md)
3. Open an issue on GitHub
4. Contact the maintainer

### How do I report a bug?

1. Check if it's already reported
2. Include error messages and logs
3. Describe steps to reproduce
4. Open a GitHub issue

### Can I contribute?

Yes! Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Next Steps

- [Get started with setup](./01-getting-started.md)
- [Learn about RAG architecture](./02-rag-architecture.md)
- [Manage your knowledge base](./03-knowledge-base.md)
- [Customize the chatbot](./05-customization.md)
