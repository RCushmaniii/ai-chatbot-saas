import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.development.local" });
config({ path: ".env.local" });
config({ path: ".env" });

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);

async function migrateKnowledgeMultitenant() {
  console.log("🚀 Migrating knowledge base to multi-tenant architecture...\n");

  try {
    // 1. Enable pgvector extension
    await client.unsafe("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("✅ pgvector extension enabled");

    // 2. Create content source type enum
    await client.unsafe(`
      DO $$ BEGIN
        CREATE TYPE content_source_type AS ENUM ('website', 'pdf', 'text', 'paste');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✅ Created content_source_type enum");

    // 3. Create content source status enum
    await client.unsafe(`
      DO $$ BEGIN
        CREATE TYPE content_source_status AS ENUM ('pending', 'processing', 'processed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✅ Created content_source_status enum");

    // 4. Create ContentSource table
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS "ContentSource" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES "Business"(id),
        bot_id UUID REFERENCES "Bot"(id),
        type content_source_type NOT NULL,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500),
        status content_source_status NOT NULL DEFAULT 'pending',
        page_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP
      );
    `);
    console.log("✅ Created ContentSource table");

    // 5. Create KnowledgeChunk table with vector embeddings
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES "Business"(id),
        bot_id UUID REFERENCES "Bot"(id),
        source_id UUID NOT NULL REFERENCES "ContentSource"(id),
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB,
        token_count INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Created KnowledgeChunk table");

    // 6. Add business_id to legacy Document_Knowledge if not exists
    await client.unsafe(`
      ALTER TABLE "Document_Knowledge"
      ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES "Business"(id);
    `);
    console.log("✅ Added business_id to Document_Knowledge");

    // 7. Create indexes for efficient tenant-isolated queries
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_business
      ON "KnowledgeChunk"(business_id);
    `);
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_bot
      ON "KnowledgeChunk"(bot_id);
    `);
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_content_source_business
      ON "ContentSource"(business_id);
    `);
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_document_knowledge_business
      ON "Document_Knowledge"(business_id);
    `);
    console.log("✅ Created tenant isolation indexes");

    // 8. Create vector similarity index for fast RAG searches
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embedding
      ON "KnowledgeChunk"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    console.log("✅ Created vector similarity index");

    console.log("\n✅ Multi-tenant knowledge migration complete!");
    console.log(`
📊 New tables created:
   - ContentSource: Tracks uploaded content (websites, PDFs, etc.)
   - KnowledgeChunk: Tenant-isolated vector embeddings for RAG

🔒 Tenant isolation:
   - Every query MUST filter by business_id
   - Indexes created for fast tenant-scoped searches
   - Vector similarity index for efficient RAG
    `);
  } catch (error) {
    console.error("❌ Migration error:", error);
    throw error;
  } finally {
    await client.end();
  }
}

migrateKnowledgeMultitenant().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
