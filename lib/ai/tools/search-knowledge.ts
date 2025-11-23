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

export async function searchKnowledgeDirect(
  query: string
): Promise<KnowledgeSearchResult[]> {
  try {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Convert the query to an embedding
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: trimmed,
    });

    // 2. Search the vector database for similar content using cosine similarity
    // First try website_content (scraped from nyenglishteacher.com)
    const websiteResults = await client.unsafe(`
      SELECT content, url, metadata,
        1 - (embedding <=> '${JSON.stringify(embedding)}'::vector) as similarity
      FROM website_content
      WHERE 1 - (embedding <=> '${JSON.stringify(embedding)}'::vector) > 0.5
      ORDER BY similarity DESC
      LIMIT 3
    `);

    // Fallback to Document_Knowledge if no website results
    const results = websiteResults.length > 0 ? websiteResults : await client.unsafe(`
      SELECT content, url, metadata,
        1 - (embedding <=> '${JSON.stringify(embedding)}'::vector) as similarity
      FROM "Document_Knowledge"
      WHERE 1 - (embedding <=> '${JSON.stringify(embedding)}'::vector) > 0.6
      ORDER BY similarity DESC
      LIMIT 3
    `);

    if (!results || results.length === 0) {
      return [];
    }

    return results.map((row: any) => ({
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
