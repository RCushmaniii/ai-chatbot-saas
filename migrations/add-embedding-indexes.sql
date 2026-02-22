-- Add HNSW indexes on embedding columns for faster vector similarity searches.
-- HNSW provides better query performance than IVFFlat and doesn't require training.
-- Requires pgvector >= 0.5.0.

-- Index for the primary knowledge chunks table (multi-tenant RAG)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embedding_hnsw
  ON "KnowledgeChunk"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for the legacy Document_Knowledge table
CREATE INDEX IF NOT EXISTS idx_document_knowledge_embedding_hnsw
  ON "Document_Knowledge"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Drop deprecated password column from User table (Clerk handles auth)
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
