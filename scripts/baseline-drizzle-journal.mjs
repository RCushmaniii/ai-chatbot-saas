#!/usr/bin/env node
/**
 * Mark every existing drizzle migration as already applied on this database.
 *
 * WHY THIS IS NEEDED
 *
 * Converso's database was built on 2026-09-25 from a `pg_dump --schema-only` of
 * the shared database it used to live in, not by replaying migrations. A dump
 * reproduces what is actually there — including the pgvector columns, the HNSW
 * indexes, and the UsageRecord unique index that exists only in the hand-run
 * `migrations/` folder drizzle never reads. A replay would have reproduced only
 * the journalled subset and shipped a database that 500s on the first widget
 * message.
 *
 * The cost of that choice is that `drizzle.__drizzle_migrations` does not exist,
 * so drizzle believes nothing has ever been applied. The next `db:migrate` would
 * try to CREATE TABLE "User" on a database that already has it, and fail — or,
 * worse, half-apply before failing.
 *
 * This writes the journal drizzle would have written. `created_at` carries each
 * migration's `when` value from meta/_journal.json, which is the field the
 * migrator compares against; `hash` is the sha256 of the migration file, which
 * is what drizzle stores. After this, `db:migrate` correctly applies only
 * migrations newer than 0014 and leaves everything else alone.
 *
 * Idempotent: re-running changes nothing.
 *
 * Usage:  node scripts/baseline-drizzle-journal.mjs [--dry-run]
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const DRY = process.argv.includes("--dry-run");
const DIR = "lib/db/migrations";

const journal = JSON.parse(
	readFileSync(join(DIR, "meta", "_journal.json"), "utf8"),
);

const entries = journal.entries.map((e) => {
	const sql = readFileSync(join(DIR, `${e.tag}.sql`), "utf8");
	return {
		tag: e.tag,
		when: e.when,
		hash: createHash("sha256").update(sql).digest("hex"),
	};
});

console.log(
	`\n${entries.length} journalled migrations, newest ${entries.at(-1).tag}\n`,
);

const sql = postgres(process.env.POSTGRES_URL, { ssl: "require", max: 1 });

const existing = await sql`
  SELECT count(*)::int AS n FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'drizzle' AND c.relname = '__drizzle_migrations'`;

if (existing[0].n > 0) {
	const rows = await sql`
    SELECT count(*)::int AS n, max(created_at) AS newest
    FROM drizzle.__drizzle_migrations`;
	console.log(
		`already baselined: ${rows[0].n} row(s), newest created_at ${rows[0].newest}`,
	);
	await sql.end();
	process.exit(0);
}

if (DRY) {
	console.log(
		"--dry-run: would create drizzle.__drizzle_migrations and insert:",
	);
	for (const e of entries) console.log(`   ${e.tag}  ${e.when}`);
	await sql.end();
	process.exit(0);
}

await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS drizzle`);
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )`);

for (const e of entries) {
	await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${e.hash}, ${e.when})`;
}

const [after] = await sql`
  SELECT count(*)::int AS n, max(created_at) AS newest
  FROM drizzle.__drizzle_migrations`;
console.log(
	`✅ baselined ${after.n} migrations, newest created_at ${after.newest} (${entries.at(-1).tag})`,
);
console.log(
	"   db:migrate will now apply only migrations generated after this point.\n",
);

await sql.end();
