# RAG Architecture

This document explains the Retrieval Augmented Generation (RAG) implementation in the NY English Teacher AI Chatbot.

## Overview

RAG enhances the chatbot's responses by retrieving relevant information from a knowledge base before generating answers. This ensures accurate, business-specific responses.

## Architecture Components

### 1. Vector Database (PostgreSQL + pgvector)

The knowledge base uses PostgreSQL with the pgvector extension for semantic search.

**Schema (`lib/db/schema.ts`):**

```typescript
export const documents = pgTable("Document_Knowledge", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  url: text("url"),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Key fields:**

- `content` - The actual text chunk (max ~1500 characters)
- `embedding` - 1536-dimensional vector from OpenAI's `text-embedding-3-small`
- `metadata` - JSON with `{ type, language, sourceFile }`
- `url` - Source URL or reference

### 2. Embeddings (OpenAI)

We use OpenAI's `text-embedding-3-small` model to convert text into vectors:

```typescript
const { embedding } = await embed({
  model: openai.embedding("text-embedding-3-small"),
  value: text,
});
```

**Why text-embedding-3-small?**

- 1536 dimensions (good balance of performance and accuracy)
- Cost-effective
- Fast inference
- Excellent for semantic search

### 3. Deterministic RAG (Server-Side)

Unlike tool-based RAG, we use **deterministic RAG** where context is injected server-side for every request.

**Flow (`app/(chat)/api/chat/route.ts`):**

```typescript
// 1. Extract user's query
const userMessage = messages[messages.length - 1];
const query = getTextFromMessage(userMessage);

// 2. Search knowledge base
const knowledgeResults = await searchKnowledgeDirect(query, 3);

// 3. Inject context into system prompt
const knowledgeContext =
  knowledgeResults.length > 0
    ? `\n\n## Relevant Knowledge Base Context:\n${knowledgeResults
        .map((r, i) => `[${i + 1}] ${r.content}`)
        .join("\n\n")}`
    : "";

const systemPrompt = regularPrompt + knowledgeContext;
```

**Benefits:**

- Reliable - Context is always included
- Predictable - No tool-calling failures
- Fast - No extra LLM round-trips
- Transparent - Easy to debug

### 4. Semantic Search

The `searchKnowledgeDirect` function performs vector similarity search:

```typescript
export async function searchKnowledgeDirect(
  query: string,
  limit = 3
): Promise<KnowledgeSearchResult[]> {
  // 1. Convert query to embedding
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });

  // 2. Search using cosine similarity
  const results = await client.unsafe(
    `
    SELECT 
      id, content, url, metadata,
      1 - (embedding <=> $1::vector) AS similarity
    FROM "Document_Knowledge"
    WHERE 1 - (embedding <=> $1::vector) > 0.5
    ORDER BY similarity DESC
    LIMIT $2
  `,
    [JSON.stringify(embedding), limit]
  );

  return results;
}
```

**Key concepts:**

- `<=>` - Cosine distance operator (pgvector)
- `1 - distance` - Convert distance to similarity score
- `> 0.5` - Only return results with >50% similarity
- `LIMIT 3` - Top 3 most relevant chunks

## RAG Flow Diagram

```
User Query
    ↓
1. Extract text from message
    ↓
2. Convert to embedding (OpenAI)
    ↓
3. Vector similarity search (pgvector)
    ↓
4. Retrieve top 3 chunks
    ↓
5. Inject into system prompt
    ↓
6. Generate response (GPT-4o)
    ↓
Response to User
```

## Text Chunking Strategy

Documents are split into ~1500 character chunks for optimal retrieval:

```typescript
function chunkText(text: string, maxLength = 1500) {
  const chunks: string[] = [];
  let current = text.trim();

  while (current.length > maxLength) {
    // Try to split at paragraph breaks
    let splitIndex = current.lastIndexOf("\n\n", maxLength);
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }
    chunks.push(current.slice(0, splitIndex).trim());
    current = current.slice(splitIndex).trim();
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}
```

**Why 1500 characters?**

- Fits within context window efficiently
- Preserves semantic meaning
- Balances specificity vs. context
- Works well with embedding models

## Performance Considerations

### Embedding Caching

Embeddings are stored in the database, so we only compute them once per document chunk.

### Query Optimization

- Index on `embedding` column for fast similarity search
- Limit results to top 3 (configurable)
- Filter by similarity threshold (>0.5)

### Cost Optimization

- Use `text-embedding-3-small` (cheaper than `text-embedding-3-large`)
- Chunk documents to avoid re-embedding entire files
- Cache embeddings in database

## Comparison: Deterministic vs Tool-Based RAG

| Aspect          | Deterministic (Our Approach) | Tool-Based                      |
| --------------- | ---------------------------- | ------------------------------- |
| **Reliability** | ✅ Always includes context   | ⚠️ Model may not call tool      |
| **Latency**     | ✅ Single LLM call           | ⚠️ Multiple round-trips         |
| **Debugging**   | ✅ Easy to trace             | ⚠️ Complex tool execution       |
| **Cost**        | ✅ Lower (fewer tokens)      | ⚠️ Higher (tool calls)          |
| **Flexibility** | ⚠️ Always searches           | ✅ Model decides when to search |

## Next Steps

- [Learn how to manage the knowledge base](./03-knowledge-base.md)
- [Understand file upload processing](./04-file-upload.md)
- [Customize system prompts](./05-customization.md)
