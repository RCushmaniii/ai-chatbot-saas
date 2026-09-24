/**
 * Ingest a whole website into one tenant's knowledge base, from the command line.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT THE ADMIN BUTTON
 *
 * The admin route (`/api/admin/knowledge/ingest`) caps at 20 pages, because it
 * runs as a Vercel function that is killed at 300 seconds. That cap is a
 * property of the runtime, not of the task. cushlabs.ai has 126 URLs; the
 * sibling ny-ai-chatbot repo indexes 476 pages of nyenglishteacher.com the same
 * way this script does — as a local CLI run with no timeout to dodge.
 *
 * Scraping and chunking come from lib/ingest/site.ts, shared with the route, so
 * the two cannot drift. Everything below is the multi-tenant storage half.
 *
 * WHAT IT WILL NOT TOUCH
 *
 * Writes go to a ContentSource of type 'website' named after the base URL, and
 * deletes are scoped to `source_id`. Curated knowledge lives under a different
 * source (type 'text'), so re-ingesting a site can never disturb hand-written
 * answers. That separation is the two-class model: scrape for coverage, curate
 * the facts you cannot afford to have missed.
 *
 * INCREMENTAL BY CONTENT HASH
 *
 * Chunks whose SHA-256 already exists under this source are skipped, so only new
 * or changed text pays the OpenAI embedding cost. A re-run after editing one
 * page embeds that page and nothing else.
 *
 * Usage:
 *   pnpm tsx scripts/ingest-site.ts --business <uuid> --site https://www.cushlabs.ai
 *   pnpm tsx scripts/ingest-site.ts --business <uuid> --site cushlabs.ai --dry-run
 *   pnpm tsx scripts/ingest-site.ts --business <uuid> --site cushlabs.ai --max 50
 */
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { config as dotenvConfig } from "dotenv";
import postgres from "postgres";
import {
	chunkContent,
	discoverPages,
	hashContent,
	scrapePage,
} from "../lib/ingest/site";

dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

/** No serverless timeout here, so the default is "the whole site". */
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

	console.log(`\n📚 Ingesting ${site} → ${business.name}\n`);

	const { urls, method, sitemapUrl } = await discoverPages(site, maxPages);
	console.log(`🔎 Discovered ${urls.length} pages via ${method}`);
	if (sitemapUrl) console.log(`   sitemap: ${sitemapUrl}`);
	if (urls.length === 0)
		throw new Error("No pages discovered — nothing to do.");

	if (dryRun) {
		console.log("\n--dry-run: pages that WOULD be ingested\n");
		for (const [i, u] of urls.entries()) console.log(`  ${i + 1}. ${u}`);
		await sql.end();
		return;
	}

	const baseUrl = new URL(site.startsWith("http") ? site : `https://${site}`)
		.origin;

	// Reuse the source row for this site so re-ingest stays incremental.
	const [existing] = await sql`
    SELECT id FROM "ContentSource"
    WHERE business_id = ${businessId} AND type = 'website' AND name = ${baseUrl}
    LIMIT 1`;

	let sourceId: string;
	if (existing) {
		sourceId = existing.id;
		await sql`UPDATE "ContentSource" SET status='processing', url=${sitemapUrl ?? baseUrl} WHERE id=${sourceId}`;
	} else {
		const [created] = await sql`
      INSERT INTO "ContentSource" (business_id, type, name, url, status)
      VALUES (${businessId}, 'website', ${baseUrl}, ${sitemapUrl ?? baseUrl}, 'processing')
      RETURNING id`;
		sourceId = created.id;
	}

	const known = new Set(
		(
			await sql`SELECT content_hash FROM "KnowledgeChunk" WHERE source_id = ${sourceId}`
		)
			.map((r) => r.content_hash as string | null)
			.filter((h): h is string => Boolean(h)),
	);
	console.log(`   ${known.size} chunks already indexed for this source\n`);

	const seen = new Set<string>();
	let embedded = 0;
	let skipped = 0;
	const failed: string[] = [];

	for (const [i, url] of urls.entries()) {
		const page = await scrapePage(url);
		if (!page) {
			failed.push(url);
			console.log(`[${i + 1}/${urls.length}] ⚠️  ${url} — unreadable, skipped`);
			continue;
		}

		const chunks = chunkContent(page.content);
		let newForPage = 0;

		for (const content of chunks) {
			const hash = hashContent(content);
			seen.add(hash);
			if (known.has(hash)) {
				skipped++;
				continue;
			}

			const { embedding } = await embed({
				model: openai.embedding("text-embedding-3-small"),
				value: content,
			});

			await sql`
        INSERT INTO "KnowledgeChunk"
          (business_id, bot_id, source_id, content, content_hash, embedding, metadata)
        VALUES (
          ${businessId}, ${bot?.id ?? null}, ${sourceId}, ${content}, ${hash},
          ${JSON.stringify(embedding)}::vector,
          ${sql.json({ url, title: page.title })}
        )`;
			embedded++;
			newForPage++;
		}

		console.log(
			`[${i + 1}/${urls.length}] ${page.title || url} — ${chunks.length} chunks, ${newForPage} new`,
		);
	}

	// Drop chunks whose text no longer appears anywhere on the site. Scoped to
	// this source, so curated knowledge is untouched by construction.
	const orphans = [...known].filter((h) => !seen.has(h));
	if (orphans.length > 0) {
		await sql`DELETE FROM "KnowledgeChunk" WHERE source_id = ${sourceId} AND content_hash = ANY(${orphans})`;
	}

	await sql`
    UPDATE "ContentSource"
    SET status='processed', page_count=${urls.length - failed.length}, processed_at=NOW()
    WHERE id = ${sourceId}`;

	const [total] = await sql`
    SELECT count(*)::int n FROM "KnowledgeChunk" WHERE source_id = ${sourceId}`;
	const [curated] = await sql`
    SELECT count(*)::int n FROM "KnowledgeChunk" k
    LEFT JOIN "ContentSource" s ON s.id = k.source_id
    WHERE k.business_id = ${businessId} AND (s.type IS NULL OR s.type <> 'website')`;

	console.log(`\n🎉 ${business.name}`);
	console.log(
		`   pages read:        ${urls.length - failed.length}/${urls.length}`,
	);
	console.log(`   chunks embedded:   ${embedded}`);
	console.log(`   unchanged skipped: ${skipped}`);
	console.log(`   orphans removed:   ${orphans.length}`);
	console.log(`   website chunks:    ${total.n}`);
	console.log(`   curated untouched: ${curated.n}`);
	if (failed.length > 0) {
		console.log(`\n⚠️  ${failed.length} page(s) unreadable:`);
		for (const u of failed) console.log(`   - ${u}`);
	}

	await sql.end();
}

main().catch(async (e) => {
	console.error("❌ Ingestion failed:", e);
	await sql.end().catch(() => {});
	process.exit(1);
});
