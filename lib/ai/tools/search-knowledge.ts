import { openai } from "@ai-sdk/openai";
import { embed, tool } from "ai";
import postgres from "postgres";
import { z } from "zod";

// Shared Postgres client for knowledge searches.
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
  similarityThreshold?: number; // Minimum similarity (default: 0.3 — see searchKnowledgeDirect)
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
        (a, b) => a[1] - b[1],
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Search knowledge base with tenant isolation.
 *
 * SECURITY:
 *   - businessId is REQUIRED. Without it the function returns []
 *     (no cross-tenant fallback to legacy tables).
 *   - businessId and botId must be valid UUIDs; invalid values return [].
 *   - All values are passed as bound parameters via postgres.js tagged
 *     templates — no string interpolation, no SQL injection surface.
 */
export async function searchKnowledgeDirect(
  query: string,
  options: KnowledgeSearchOptions = {},
): Promise<KnowledgeSearchResult[]> {
  try {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const {
      businessId,
      botId,
      maxChunks = 5,
      /**
       * 0.4 was too high and it failed SILENTLY — the worst shape of wrong.
       *
       * A short question and a paragraph are not similar vectors even when the
       * paragraph is the perfect answer. Measured against the CushLabs tenant
       * on 2026-08-27 with text-embedding-3-small: the CORRECT chunk scored
       * 0.31–0.51 for ordinary questions ("How much does it cost?" 0.46,
       * "What are your plans?" 0.37, "is it expensive" 0.39) while unrelated
       * chunks sat at 0.09–0.25. So the ranking was always right and the gap
       * was always wide — the absolute floor was simply set above where real
       * matches live, and everything under it returned zero results.
       *
       * The consequence in production: a visitor asked the price, retrieval
       * returned nothing, and a correctly-grounded assistant answered "let's
       * get you on a call with Robert" for a price that was sitting in the
       * database. It looked like deliberate evasion. Spanish queries scored
       * marginally higher and squeaked over 0.4, which is how it stayed
       * hidden — testing in Spanish showed a working bot.
       *
       * 0.3 sits in the observed gap: above the 0.25 noise ceiling, below the
       * 0.31 floor of genuine matches. Retrieving a marginal chunk is cheap —
       * results are ranked, capped at maxChunks, and the persona is instructed
       * to answer only from what is relevant. Retrieving NOTHING is expensive,
       * because the assistant cannot tell "no answer exists" from "the search
       * missed" and defers on a question it could have answered.
       */
      similarityThreshold = 0.3,
    } = options;

    // Tenant isolation gate: refuse to query without a valid businessId.
    if (!isUuid(businessId)) return [];
    if (botId !== undefined && !isUuid(botId)) return [];

    // 1. Generate embedding for the query
    const embedding = await generateEmbedding(trimmed);
    if (!embedding) return [];

    const embeddingStr = JSON.stringify(embedding);
    const results: KnowledgeSearchResult[] = [];

    // 2. Search new KnowledgeChunk table (tenant-isolated)
    const botFilter = botId
      ? client`AND (bot_id = ${botId} OR bot_id IS NULL)`
      : client``;

    const chunkResults = await client`
			SELECT content, metadata,
				1 - (embedding <=> ${embeddingStr}::vector) AS similarity
			FROM "KnowledgeChunk"
			WHERE business_id = ${businessId}
				${botFilter}
				AND embedding IS NOT NULL
				AND 1 - (embedding <=> ${embeddingStr}::vector) > ${similarityThreshold}
			ORDER BY similarity DESC
			LIMIT ${maxChunks}
		`;

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

    // 3. Search legacy Document_Knowledge for backwards compatibility.
    // Tenant-scoped only — rows with NULL business_id are excluded to prevent
    // cross-tenant data leakage during the legacy → KnowledgeChunk migration.
    if (results.length < maxChunks) {
      const remaining = maxChunks - results.length;

      const legacyResults = await client`
				SELECT content, url, metadata,
					1 - (embedding <=> ${embeddingStr}::vector) AS similarity
				FROM "Document_Knowledge"
				WHERE business_id = ${businessId}
					AND embedding IS NOT NULL
					AND 1 - (embedding <=> ${embeddingStr}::vector) > ${similarityThreshold}
				ORDER BY similarity DESC
				LIMIT ${remaining}
			`;

      for (const row of legacyResults) {
        results.push({
          content: row.content as string,
          url: (row.url as string) ?? null,
          similarity: Number(row.similarity),
          metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        });
      }
    }

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
