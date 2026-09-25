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
