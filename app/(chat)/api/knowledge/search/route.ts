import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import postgres from "postgres";

// Create a singleton pool for serverless environments
const client = postgres(process.env.POSTGRES_URL!, {
  max: 1, // Limit connections in serverless
});

export async function POST(req: Request) {
  try {
    const { query, limit = 4 } = await req.json();

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    // Create embedding for the query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    // SQL: Cosine similarity search using pgvector
    const results = await client`
      SELECT 
        content, 
        metadata,
        url,
        1 - (embedding <=> ${JSON.stringify(embedding)}) as similarity
      FROM website_content
      WHERE 1 - (embedding <=> ${JSON.stringify(embedding)}) > 0.5
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    // Format context for the LLM
    const contextText = results
      .map((r) => {
        const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
        return `SOURCE: ${meta.title || 'Untitled'} (${r.url})\nCONTENT: ${r.content}`;
      })
      .join("\n\n---\n\n");

    return Response.json({ 
      context: contextText,
      sources: results.map(r => ({
        url: r.url,
        title: typeof r.metadata === 'string' ? JSON.parse(r.metadata).title : r.metadata?.title,
        similarity: r.similarity
      }))
    });

  } catch (error) {
    console.error("Knowledge search error:", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
