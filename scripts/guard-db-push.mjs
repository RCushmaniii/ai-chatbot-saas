#!/usr/bin/env node
/**
 * Refuses `drizzle-kit push` while this app shares a database with another one.
 *
 * ai-chatbot-saas was cloned from ny-ai-chatbot on 2025-12-02 — identical commit
 * SHAs through a4b9a23 — and when the Converso Vercel project was created on
 * 2026-01-24 it was pointed at New York English Teacher's existing Neon database
 * rather than given its own. The env var sets are the proof: ny-ai-chatbot
 * carries the full Neon-integration series, this project carries a single
 * hand-set connection variable.
 *
 * WHY THIS GUARD EXISTS
 *
 * `drizzle-kit push` reconciles the database to lib/db/schema.ts. NY English
 * Teacher's tables are NOT in that schema — website_content (3,901 rows of its
 * live knowledge base), knowledge_events, chat_analytics, lead_events,
 * handoff_events. A push from this repo sees them as tables that should not
 * exist. One command, run in the wrong repo, destroys a client-facing production
 * knowledge base, with no backup step standing in front of it.
 *
 * This guard removes itself by passing: once this app has its own database, the
 * probe stops finding those tables and the push proceeds normally.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

/** Tables that prove we are looking at ny-ai-chatbot's database. */
const FOREIGN_TABLES = [
  "website_content",
  "knowledge_events",
  "chat_analytics",
  "lead_events",
  "handoff_events",
];

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error(
    "✋ No database connection configured — refusing to push blind.",
  );
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });
try {
  const found = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${FOREIGN_TABLES})`;

  if (found.length > 0) {
    console.error(
      [
        "",
        "✋ REFUSING TO PUSH — this database is shared with ny-ai-chatbot.",
        "",
        `   Found ${found.length} table(s) belonging to New York English Teacher:`,
        ...found.map((r) => `     - ${r.table_name}`),
        "",
        "   drizzle-kit push reconciles the database to lib/db/schema.ts, and none",
        "   of these tables are in it. Pushing can DROP a live client's knowledge",
        "   base. website_content alone holds 3,901 rows serving",
        "   chat.nyenglishteacher.com right now.",
        "",
        "   Split the databases first. Until then use db:generate + db:migrate,",
        "   which apply only the migrations you have reviewed.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(
    "✅ No foreign tables found — this database is not shared. Push allowed.",
  );
} finally {
  await sql.end();
}
