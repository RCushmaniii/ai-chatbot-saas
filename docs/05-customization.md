# Customization Guide

Learn how to customize the chatbot for your specific business needs.

## System Prompts

### Location

System prompts are defined in `lib/ai/prompts.ts`.

### Main Prompt Structure

```typescript
export const regularPrompt = `
You are a friendly and professional AI assistant for New York English Teacher...

## Your Role
- Provide information about English coaching services
- Answer questions in the user's language (English or Spanish)
- Direct users to book consultations

## Business Details
[Services, pricing, target audience, etc.]

## Important Instructions
1. Always respond in the same language as the user
2. For booking questions, include: ${BOOKING_URL}
3. Use knowledge base context when available
`;
```

### Customizing for Your Business

**1. Update business details:**

```typescript
export const regularPrompt = `
You are a friendly AI assistant for [YOUR BUSINESS NAME]...

## Your Role
- [Your primary service]
- [Your value proposition]
- [Your target audience]

## Services Offered
- [Service 1]: [Description]
- [Service 2]: [Description]
- [Service 3]: [Description]

## Pricing
- [Package 1]: [Price]
- [Package 2]: [Price]
`;
```

**2. Add your booking URL:**

```typescript
const BOOKING_URL = "https://your-business.com/book";
```

**3. Customize tone and style:**

```typescript
// Professional
"You are a professional consultant...";

// Friendly
"You are a friendly helper...";

// Technical
"You are an expert technical advisor...";
```

### Language Support

The chatbot automatically detects and responds in the user's language. To add more languages:

**1. Update knowledge base with translated content:**

```typescript
await addDocument("Contenido en español...", "https://example.com", {
  type: "faq",
  language: "es",
});

await addDocument("Contenu en français...", "https://example.com", {
  type: "faq",
  language: "fr",
});
```

**2. Update system prompt:**

```typescript
export const regularPrompt = `
...
## Language Support
- Respond in the user's language (English, Spanish, French)
- Maintain consistent terminology across languages
...
`;
```

## RAG Configuration

### Search Parameters

**File:** `lib/ai/tools/search-knowledge.ts`

```typescript
export async function searchKnowledgeDirect(
  query: string,
  limit = 3 // Number of chunks to retrieve
): Promise<KnowledgeSearchResult[]> {
  // ...
}
```

**Adjust retrieval count:**

```typescript
// More context (may be redundant)
const results = await searchKnowledgeDirect(query, 5);

// Less context (more focused)
const results = await searchKnowledgeDirect(query, 2);
```

### Similarity Threshold

```typescript
const results = await client.unsafe(
  `
  SELECT 
    id, content, url, metadata,
    1 - (embedding <=> $1::vector) AS similarity
  FROM "Document_Knowledge"
  WHERE 1 - (embedding <=> $1::vector) > 0.5  // Adjust this
  ORDER BY similarity DESC
  LIMIT $2
`,
  [JSON.stringify(embedding), limit]
);
```

**Threshold guidelines:**

- `> 0.7` - Very strict (only highly relevant)
- `> 0.5` - Balanced (recommended)
- `> 0.3` - Permissive (may include tangential content)

### Chunk Size

**File:** `app/api/admin/knowledge/pdf/route.ts`

```typescript
function chunkText(text: string, maxLength = 1500) {
  // Adjust maxLength for your needs
}
```

**Size guidelines:**

- `1000` - Shorter, more specific chunks
- `1500` - Balanced (recommended)
- `2000` - Longer, more context

## UI Customization

### Branding

**1. Update site metadata:**

```typescript
// app/layout.tsx
export const metadata = {
  title: "Your Business Name - AI Assistant",
  description: "Your business description",
};
```

**2. Update logo and colors:**

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "#your-color",
        secondary: "#your-color",
      },
    },
  },
};
```

**3. Update suggested questions:**

```typescript
// components/suggested-actions.tsx
const suggestedActions = [
  {
    title: "Your question 1",
    label: "Description",
    action: "Your question 1?",
  },
  {
    title: "Your question 2",
    label: "Description",
    action: "Your question 2?",
  },
];
```

### Admin Panel

**File:** `components/admin-knowledge-base.tsx`

**Customize content types:**

```typescript
<Select value={type} onValueChange={setType}>
  <SelectItem value="general">General Info</SelectItem>
  <SelectItem value="faq">FAQ</SelectItem>
  <SelectItem value="service">Service</SelectItem>
  <SelectItem value="pricing">Pricing</SelectItem>
  {/* Add your types */}
  <SelectItem value="policy">Policy</SelectItem>
  <SelectItem value="tutorial">Tutorial</SelectItem>
</Select>
```

**Customize languages:**

```typescript
<Select value={language} onValueChange={setLanguage}>
  <SelectItem value="en">English</SelectItem>
  <SelectItem value="es">Spanish</SelectItem>
  {/* Add your languages */}
  <SelectItem value="fr">French</SelectItem>
  <SelectItem value="de">German</SelectItem>
</Select>
```

## AI Model Configuration

### Location

AI models are configured in `lib/ai/providers.ts`.

### Current Setup

```typescript
import { openai } from "@ai-sdk/openai";

export const myProvider = {
  chat: openai("gpt-4o"),
  reasoning: openai("o1-mini"),
  title: openai("gpt-4o-mini"),
  embedding: openai.embedding("text-embedding-3-small"),
};
```

### Switching Models

**Use GPT-4 Turbo:**

```typescript
export const myProvider = {
  chat: openai("gpt-4-turbo"),
  // ...
};
```

**Use GPT-3.5 (cheaper):**

```typescript
export const myProvider = {
  chat: openai("gpt-3.5-turbo"),
  // ...
};
```

**Use different embedding model:**

```typescript
export const myProvider = {
  embedding: openai.embedding("text-embedding-3-large"), // More accurate
  // or
  embedding: openai.embedding("text-embedding-ada-002"), // Legacy
};
```

### Adding Other Providers

**Anthropic (Claude):**

```typescript
import { anthropic } from "@ai-sdk/anthropic";

export const myProvider = {
  chat: anthropic("claude-3-5-sonnet-20241022"),
  // ...
};
```

**Groq (Fast inference):**

```typescript
import { groq } from "@ai-sdk/groq";

export const myProvider = {
  chat: groq("llama-3.1-70b-versatile"),
  // ...
};
```

## Database Schema

### Adding Custom Fields

**File:** `lib/db/schema.ts`

```typescript
export const documents = pgTable("Document_Knowledge", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  url: text("url"),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  // Add custom fields
  category: text("category"),
  tags: text("tags"),
  priority: integer("priority").default(0),
});
```

**Run migration:**

```bash
pnpm db:generate
pnpm db:migrate
```

## Environment Variables

### Adding Custom Variables

**1. Add to `.env.development.local`:**

```bash
CUSTOM_API_KEY="your-key"
CUSTOM_SETTING="value"
```

**2. Use in code:**

```typescript
const apiKey = process.env.CUSTOM_API_KEY;
```

**3. Add to `.env.example` for documentation:**

```bash
# Custom Integration
CUSTOM_API_KEY=
CUSTOM_SETTING=
```

## Advanced Customization

### Custom Tools

Add custom tools for the AI to use:

**File:** `lib/ai/tools/your-tool.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";

export const yourTool = tool({
  description: "Description of what your tool does",
  inputSchema: z.object({
    param: z.string().describe("Parameter description"),
  }),
  execute: async ({ param }) => {
    // Your tool logic
    return { result: "..." };
  },
});
```

**Register in chat route:**

```typescript
// app/(chat)/api/chat/route.ts
import { yourTool } from "@/lib/ai/tools/your-tool";

const tools = {
  // ... existing tools
  yourTool,
};
```

### Custom Middleware

Add middleware for logging, analytics, etc.:

**File:** `middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Log requests
  console.log(`${request.method} ${request.url}`);

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set("X-Custom-Header", "value");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
```

## Testing Customizations

### Local Testing

1. Make changes
2. Restart dev server: `pnpm dev`
3. Test in browser
4. Check console for errors

### Production Testing

1. Deploy to staging environment
2. Test with real users
3. Monitor logs and errors
4. Roll back if needed

## Next Steps

- [Read the FAQ](./06-faq.md)
- [Learn about RAG architecture](./02-rag-architecture.md)
- [Manage knowledge base](./03-knowledge-base.md)
