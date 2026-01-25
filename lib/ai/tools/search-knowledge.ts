import { tool, embed } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import postgres from "postgres";

// Shared Postgres client for knowledge searches.
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);

export type KnowledgeSearchResult = {
  content: string;
  url: string | null;
  similarity: number;
  metadata: Record<string, any>;
};

export type KnowledgeSearchOptions = {
  businessId?: string; // Required for tenant isolation
  botId?: string; // Optional: filter by specific bot
  maxChunks?: number; // Controlled by plan tier (default: 5)
  similarityThreshold?: number; // Minimum similarity (default: 0.5)
};

// Simple in-memory cache for embeddings (prevents rate limiting during testing)
const embeddingCache = new Map<string, number[]>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

/**
 * Generate embedding for a query with caching
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const cacheKey = trimmed.toLowerCase();
  const cachedEmbedding = embeddingCache.get(cacheKey);
  const cacheTime = cacheTimestamps.get(cacheKey);

  if (cachedEmbedding && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    return cachedEmbedding;
  }

  try {
    const result = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: trimmed,
    });

    // Cache the embedding
    embeddingCache.set(cacheKey, result.embedding);
    cacheTimestamps.set(cacheKey, Date.now());

    // Clean up old cache entries (keep cache size manageable)
    if (embeddingCache.size > 100) {
      const oldestKey = Array.from(cacheTimestamps.entries()).sort(
        (a, b) => a[1] - b[1]
      )[0][0];
      embeddingCache.delete(oldestKey);
      cacheTimestamps.delete(oldestKey);
    }

    return result.embedding;
  } catch (embedError) {
    console.error("⚠️  Embedding generation failed:", embedError);
    return null;
  }
}

/**
 * Search knowledge base with tenant isolation
 * CRITICAL: Every query MUST filter by businessId for multi-tenant safety
 */
export async function searchKnowledgeDirect(
  query: string,
  options: KnowledgeSearchOptions = {}
): Promise<KnowledgeSearchResult[]> {
  try {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const {
      businessId,
      botId,
      maxChunks = 5,
      similarityThreshold = 0.5,
    } = options;

    // 1. Generate embedding for the query
    const embedding = await generateEmbedding(trimmed);
    if (!embedding) return [];

    const embeddingStr = JSON.stringify(embedding);
    const results: KnowledgeSearchResult[] = [];

    // 2. Search new KnowledgeChunk table (tenant-isolated)
    if (businessId) {
      const tenantFilter = botId
        ? `business_id = '${businessId}' AND (bot_id = '${botId}' OR bot_id IS NULL)`
        : `business_id = '${businessId}'`;

      const chunkResults = await client.unsafe(`
        SELECT content, metadata,
          1 - (embedding <=> '${embeddingStr}'::vector) as similarity
        FROM "KnowledgeChunk"
        WHERE ${tenantFilter}
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> '${embeddingStr}'::vector) > ${similarityThreshold}
        ORDER BY similarity DESC
        LIMIT ${maxChunks}
      `);

      for (const row of chunkResults) {
        const meta =
          typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata || {};
        results.push({
          content: row.content as string,
          url: meta.url ?? null,
          similarity: Number(row.similarity),
          metadata: meta,
        });
      }
    }

    // 3. Also search legacy tables if no tenant-specific results
    // This maintains backwards compatibility during migration
    if (results.length < maxChunks) {
      const remaining = maxChunks - results.length;

      // Search legacy Document_Knowledge (with optional tenant filter)
      const legacyFilter = businessId
        ? `(business_id = '${businessId}' OR business_id IS NULL)`
        : "1=1";

      const legacyResults = await client.unsafe(`
        SELECT content, url, metadata,
          1 - (embedding <=> '${embeddingStr}'::vector) as similarity
        FROM "Document_Knowledge"
        WHERE ${legacyFilter}
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> '${embeddingStr}'::vector) > ${similarityThreshold}
        ORDER BY similarity DESC
        LIMIT ${remaining}
      `);

      for (const row of legacyResults) {
        results.push({
          content: row.content as string,
          url: (row.url as string) ?? null,
          similarity: Number(row.similarity),
          metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        });
      }
    }

    // Sort by similarity and return
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxChunks);
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return [];
  }
}

/**
 * Create a tenant-isolated knowledge search tool
 * This factory ensures each chatbot only accesses its own business's content
 */
export function createKnowledgeSearchTool(context: {
  businessId: string;
  botId?: string;
  businessName?: string;
  maxChunks?: number; // From plan entitlements
}) {
  return tool({
    description: `Search the knowledge base for information about ${context.businessName || "this business"}'s services, products, and details. Use this when users ask questions that might be answered by the business's uploaded content. ALWAYS cite sources in your response.`,

    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant information"),
    }),

    execute: async (input) => {
      const { query } = input;
      const results = await searchKnowledgeDirect(query, {
        businessId: context.businessId,
        botId: context.botId,
        maxChunks: context.maxChunks || 5,
      });

      if (!results.length) {
        return {
          results: [],
          message:
            "No encontré información específica sobre eso en la base de conocimiento. Puedo intentar responder de forma general o puedes contactar directamente al negocio.",
        };
      }

      // Format results with clear source attribution
      const formattedResults = results.map((r) => ({
        content: r.content,
        source_url: r.url,
        page_title: r.metadata?.title || context.businessName || "Fuente",
        similarity_score: r.similarity,
      }));

      return {
        results: formattedResults,
        instruction:
          "Responde usando esta información. Incluye la URL de origen cuando sea relevante: 'Más información: [URL]'",
      };
    },
  });
}

// Legacy: non-tenant-isolated search tool (for backwards compatibility)
export const searchKnowledgeTool = tool({
  description:
    "Search the knowledge base for information. Use this when users ask questions that might be answered by uploaded content. ALWAYS include the source URL in your response when referencing information.",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query to find relevant information"),
  }),

  execute: async (input) => {
    const { query } = input;
    const results = await searchKnowledgeDirect(query);

    if (!results.length) {
      return {
        results: [],
        message:
          "No relevant information found in the knowledge base. Please provide a general answer or ask the user to contact the business directly.",
      };
    }

    // Format results with clear source attribution
    const formattedResults = results.map((r) => ({
      content: r.content,
      source_url: r.url,
      page_title: r.metadata?.title || "Source",
      similarity_score: r.similarity,
    }));

    return {
      results: formattedResults,
      instruction:
        "When answering, include the source URL(s) so users can learn more. Format as: 'Learn more: [URL]' or 'Read more about this: [URL]'",
    };
  },
});
