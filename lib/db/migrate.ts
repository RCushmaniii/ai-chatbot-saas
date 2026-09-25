import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({
	path: ".env.development.local",
});
config({
	path: ".env.local",
});
// The plain env file is where this repo actually keeps its connection string.
// Without this line `db:migrate` throws "POSTGRES_URL is not defined" on every
// local run and only works where the platform injects the environment — which
// is a large part of how this database came to be changed exclusively through
// hand-run SQL sitting in a second, unjournalled migrations folder.
config({
	path: ".env",
});

const runMigrate = async () => {
	if (!process.env.POSTGRES_URL) {
		throw new Error("POSTGRES_URL is not defined");
	}

	const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
	const db = drizzle(connection);

	/**
	 * pgvector must exist before the migrator starts.
	 *
	 * Migration 0008 declares `"embedding" vector(1536)` and 0010 does the same.
	 * No migration has ever created the extension — it was only ever created
	 * inside provisioning scripts that do not run at migrate time. So a replay
	 * against a fresh database, which Neon does not ship with pgvector enabled,
	 * died at 0008 with `type "vector" does not exist`.
	 *
	 * It cannot be fixed by adding a migration, because any migration numbered
	 * after 0008 is too late and renumbering history is worse. It belongs here,
	 * ahead of the migrator, where ordering is guaranteed.
	 */
	console.log("⏳ Ensuring pgvector...");
	await connection.unsafe("CREATE EXTENSION IF NOT EXISTS vector");

	console.log("⏳ Running migrations...");

	const start = Date.now();
	await migrate(db, { migrationsFolder: "./lib/db/migrations" });
	const end = Date.now();

	console.log("✅ Migrations completed in", end - start, "ms");
	process.exit(0);
};

runMigrate().catch((err) => {
	console.error("❌ Migration failed");
	console.error(err);
	process.exit(1);
});
