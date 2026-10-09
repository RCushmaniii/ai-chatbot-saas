/**
 * Ingest a website into one tenant's knowledge base, from the command line.
 *
 * Same engine as the daily retrain cron (lib/ingest/sync-website.ts), so a
 * manual run and the scheduled one produce identical rows — the chunk ids are
 * deterministic, and a re-run replaces rather than duplicates.
 *
 * WHICH PAGES
 *
 * If the source has a fixed page list in lib/ingest/site-allowlists.ts (the
 * CushLabs tenant does), exactly that list is indexed and every other page's
 * chunks are removed. Otherwise the sitemap is used, with no page cap — this
 * runs in a shell, not inside a 300-second serverless function.
 *
 * WHAT IT WILL NOT TOUCH
 *
 * Writes go to the business's ContentSource of type 'website' named after the
 * base URL, and every write is scoped to that source id AND business id.
 * Curated knowledge lives under a different source (type 'text') and is never
 * in scope.
 *
 * Usage:
 *   pnpm tsx scripts/ingest-site.ts --business <uuid> --site https://www.cushlabs.ai
 *   pnpm tsx scripts/ingest-site.ts --business <uuid> --site https://www.cushlabs.ai --dry-run
 *   pnpm tsx scripts/ingest-site.ts --business <uuid> --site example.com --max 50
 */
import { config as dotenvConfig } from "dotenv";
import postgres from "postgres";
import { discoverPages } from "../lib/ingest/site";
import { allowlistFor } from "../lib/ingest/site-allowlists";
import { syncWebsitePages } from "../lib/ingest/sync-website";

dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const DEFAULT_MAX_PAGES = 5000;

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
	const businessId = arg("business");
	const site = arg("site");
	const dryRun = process.argv.includes("--dry-run");
	const maxPages = Number(arg("max") ?? DEFAULT_MAX_PAGES);

	if (!businessId || !site) {
		console.error(
			"Usage: tsx scripts/ingest-site.ts --business <uuid> --site <url> [--max N] [--dry-run]",
		);
		process.exit(1);
	}

	const [business] = await sql`
    SELECT id, name FROM "Business" WHERE id = ${businessId}`;
	if (!business) throw new Error(`No Business with id ${businessId}`);

	const [bot] = await sql`
    SELECT id FROM "Bot" WHERE "businessId" = ${businessId} ORDER BY "createdAt" LIMIT 1`;

	const baseUrl = new URL(site.startsWith("http") ? site : `https://${site}`)
		.origin;
	console.log(`\n📚 Ingesting ${baseUrl} → ${business.name}\n`);

	const allowlist = allowlistFor(businessId, baseUrl);
	let urls: string[];
	let sitemapUrl: string | undefined;
	if (allowlist) {
		urls = [...allowlist];
		console.log(
			`🔒 Fixed page list: ${urls.length} pages (site-allowlists.ts)`,
		);
	} else {
		const found = await discoverPages(site, maxPages);
		urls = found.urls;
		sitemapUrl = found.sitemapUrl;
		console.log(`🔎 Discovered ${urls.length} pages via ${found.method}`);
	}
	if (urls.length === 0) throw new Error("No pages — nothing to do.");

	const [existing] = await sql`
    SELECT id FROM "ContentSource"
    WHERE business_id = ${businessId} AND type = 'website' AND name = ${baseUrl}
    LIMIT 1`;

	let sourceId: string;
	if (existing) {
		sourceId = existing.id;
	} else if (dryRun) {
		console.log("\n--dry-run: no website source exists yet; pages:");
		for (const u of urls) console.log(`  ${u}`);
		await sql.end();
		return;
	} else {
		const [created] = await sql`
      INSERT INTO "ContentSource" (business_id, bot_id, type, name, url, status)
      VALUES (${businessId}, ${bot?.id ?? null}, 'website', ${baseUrl}, ${sitemapUrl ?? `${baseUrl}/sitemap-index.xml`}, 'processing')
      RETURNING id`;
		sourceId = created.id;
	}

	const r = await syncWebsitePages({
		sql,
		businessId,
		botId: bot?.id ?? null,
		sourceId,
		urls,
		prune: true,
		dryRun,
		log: (l) => console.log(l),
	});

	if (!dryRun && r.pagesRead > 0) {
		await sql`
      UPDATE "ContentSource"
      SET status='processed', page_count=${r.pagesRead}, processed_at=NOW()
      WHERE id = ${sourceId} AND business_id = ${businessId}`;
	}

	console.log(
		`\n${dryRun ? "🧪 DRY RUN — nothing written" : "🎉 Done"} — ${business.name}`,
	);
	console.log(`   pages read:       ${r.pagesRead}/${urls.length}`);
	console.log(`   chunks current:   ${r.chunksCurrent}`);
	console.log(`   inserted:         ${r.chunksInserted}`);
	console.log(`   unchanged:        ${r.chunksUnchanged}`);
	console.log(`   removed:          ${r.chunksDeleted}`);
	if (r.pagesFailed.length > 0) {
		console.log(`\n⚠️  unreadable (existing chunks kept):`);
		for (const u of r.pagesFailed) console.log(`   - ${u}`);
	}

	await sql.end();
}

main().catch(async (e) => {
	console.error("❌ Ingestion failed:", e);
	await sql.end().catch(() => {});
	process.exit(1);
});
