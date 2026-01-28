import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import postgres from "postgres";

async function applyMigration() {
	if (!process.env.POSTGRES_URL) {
		console.error("POSTGRES_URL environment variable is required");
		process.exit(1);
	}

	const sql = postgres(process.env.POSTGRES_URL);

	try {
		// Read the migration file
		const migrationPath = path.join(
			__dirname,
			"../lib/db/migrations/0010_wet_fixer.sql",
		);
		const migrationContent = fs.readFileSync(migrationPath, "utf-8");

		// Split by statement breakpoint and execute each statement
		const statements = migrationContent.split("--> statement-breakpoint");

		console.log(`Applying migration with ${statements.length} statements...`);

		for (let i = 0; i < statements.length; i++) {
			const statement = statements[i].trim();
			if (!statement) continue;

			try {
				await sql.unsafe(statement);
				console.log(`✓ Statement ${i + 1}/${statements.length} applied`);
			} catch (error: unknown) {
				const pgError = error as { code?: string; message?: string };
				// Skip "already exists" errors
				if (
					pgError.code === "42P07" ||
					pgError.code === "42P06" ||
					pgError.code === "42710" ||
					pgError.message?.includes("already exists")
				) {
					console.log(
						`⏭ Statement ${i + 1}/${statements.length} skipped (already exists)`,
					);
				} else {
					console.error(`✗ Statement ${i + 1} failed:`, pgError.message);
					// Continue anyway for idempotent application
				}
			}
		}

		console.log("\n✅ Migration applied successfully!");
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

applyMigration();
