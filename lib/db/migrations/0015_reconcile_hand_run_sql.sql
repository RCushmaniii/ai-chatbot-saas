-- Folds in every schema change that was applied by hand instead of through a
-- migration, so a fresh database can be built by replay again.
--
-- Until now this repo had four sources of schema truth: the journalled
-- migrations, an unjournalled add-embed-settings.sql sitting beside them, a
-- separate repo-root migrations/ folder whose README instructed pasting SQL into
-- a console by hand, and whatever else was run ad hoc. A replay reproduced only
-- the first, which is why the database split on 2026-09-25 had to be built from
-- pg_dump: replaying would have produced a database missing
-- UsageRecord_business_month_unique, and incrementMessageCount's
-- ON CONFLICT (business_id, month) throws 42P10 without it — a widget that dies
-- on the first visitor message.
--
-- The hand-run route existed because db:migrate did not work. lib/db/migrate.ts
-- never loaded .env, so it threw "POSTGRES_URL is not defined" on every local
-- run, and in the shared database the migration watermark belonged to the other
-- app so every migration here sorted below it and was skipped. Both are fixed;
-- this removes the reason the workaround was needed.
--
-- Every statement is idempotent. On an existing database this migration is a
-- no-op; on a fresh one it supplies what the journal was missing.
--
-- NOTE: the `vector` extension is NOT created here. It has to exist before
-- migration 0008 declares a vector(1536) column, which is earlier than this
-- file. lib/db/migrate.ts creates it before the migrator runs.

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "UsageRecord_business_month_unique"
  ON "UsageRecord" (business_id, month);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embedding_hnsw
  ON "KnowledgeChunk"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_document_knowledge_embedding_hnsw
  ON "Document_Knowledge"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bot_settings_user_id
  ON bot_settings ("userId");
--> statement-breakpoint
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS "embedSettings" jsonb;
--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "membership_business_user_unique"
  ON "Membership" ("businessId", "userId");
