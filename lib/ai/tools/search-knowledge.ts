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

// Simple in-memory cache for embeddings (prevents rate limiting during testing)
const embeddingCache = new Map<string, number[]>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

export async function searchKnowledgeDirect(
  query: string
): Promise<KnowledgeSearchResult[]> {
  try {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Generate embedding for the query (with caching)
    let embedding: number[];
    const cacheKey = trimmed.toLowerCase();
    const cachedEmbedding = embeddingCache.get(cacheKey);
    const cacheTime = cacheTimestamps.get(cacheKey);
    
    if (cachedEmbedding && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
      console.log(`📦 Using cached embedding for: "${trimmed.substring(0, 50)}..."`);
      embedding = cachedEmbedding;
    } else {
      try {
        console.log(`🔄 Generating new embedding for: "${trimmed.substring(0, 50)}..."`);
        const result = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: trimmed,
        });
        embedding = result.embedding;
        
        // Cache the embedding
        embeddingCache.set(cacheKey, embedding);
        cacheTimestamps.set(cacheKey, Date.now());
        
        // Clean up old cache entries (keep cache size manageable)
        if (embeddingCache.size > 100) {
          const oldestKey = Array.from(cacheTimestamps.entries())
            .sort((a, b) => a[1] - b[1])[0][0];
          embeddingCache.delete(oldestKey);
          cacheTimestamps.delete(oldestKey);
        }
      } catch (embedError) {
        console.error('⚠️  Embedding generation failed:', embedError);
        return []; // Return empty results if embedding fails
      }
    }

    // 2. Search BOTH knowledge sources and merge results
    // Search website_content (scraped from nyenglishteacher.com)
    const websiteResults = await client.unsafe(`
      SELECT content, url, metadata,
        1 - (embedding <=> '${JSON.stringify(embedding)}'::vector) as similarity
      FROM website_content
      WHERE 1 - (embedding <=> '${JSON.stringify(embedding)}'::vector) > 0.5
      ORDER BY similarity DESC
      LIMIT 5
    `);

    // Search Document_Knowledge (manually added content from admin)
    const manualResults = await client.unsafe(`
      SELECT content, url, metadata,
        1 - (embedding <=> '${JSON.stringify(embedding)}'::vector) as similarity
      FROM "Document_Knowledge"
      WHERE 1 - (embedding <=> '${JSON.stringify(embedding)}'::vector) > 0.5
      ORDER BY similarity DESC
      LIMIT 5
    `);

    // Merge and sort by similarity, take top 5
    const allResults = [...websiteResults, ...manualResults]
      .sort((a: any, b: any) => Number(b.similarity) - Number(a.similarity))
      .slice(0, 5);

    if (!allResults || allResults.length === 0) {
      return [];
    }

    return allResults.map((row: any) => ({
      content: row.content as string,
      url: (row.url as string) ?? null,
      similarity: Number(row.similarity),
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
    }));
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return [];
  }
}

export const searchKnowledgeTool = tool({
  description:
    "Search the knowledge base for information about New York English Teacher services, pricing, coaching approach, and business details. Use this when the user asks about services, pricing, coaching methods, or any business-related questions. ALWAYS include the source URL in your response when referencing information.",

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
          "No relevant information found in the knowledge base. Please provide a general answer or ask the user to contact Robert directly.",
      };
    }

    // Format results with clear source attribution
    const formattedResults = results.map((r) => ({
      content: r.content,
      source_url: r.url,
      page_title: r.metadata?.title || "New York English Teacher",
      similarity_score: r.similarity,
    }));

    return {
      results: formattedResults,
      instruction: "When answering, include the source URL(s) so users can learn more. Format as: 'Learn more: [URL]' or 'Read more about this: [URL]'",
    };
  },
});
