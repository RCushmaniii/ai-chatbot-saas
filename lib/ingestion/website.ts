import postgres from "postgres";
import {
	crawlForLinks,
	extractUrlsFromSitemap,
	fetchSitemap,
} from "@/lib/ingest/site";
import { allowlistFor } from "@/lib/ingest/site-allowlists";
import { syncWebsitePages } from "@/lib/ingest/sync-website";

const sql = postgres(process.env.POSTGRES_URL!);

/**
 * Pages per retrain run for a source WITHOUT a page allowlist. This path runs
 * inside a Vercel function capped at 300 seconds. To index a larger site, use
 * scripts/ingest-site.ts, which has no timeout.
 *
 * Sources with an allowlist (lib/ingest/site-allowlists.ts) index exactly that
 * list and ignore this cap.
 */
const MAX_RETRAIN_PAGES = 20;

/** The bot a source's chunks belong to: the source's own, else the business's first. */
async function botIdFor(
	businessId: string,
	sourceBotId: string | null,
): Promise<string | null> {
	if (sourceBotId) return sourceBotId;
	const [row] = await sql`
		SELECT id FROM "Bot" WHERE "businessId" = ${businessId}
		ORDER BY "createdAt" LIMIT 1`;
	return (row?.id as string | undefined) ?? null;
}

/**
 * Add or refresh ONE page in a website source (accepting a "new page"
 * suggestion). Deletes nothing outside that page. Returns the page's chunk
 * count, 0 when the page could not be read.
 */
export async function scrapeAndEmbedPage({
	url,
	businessId,
	botId,
	sourceId,
}: {
	url: string;
	businessId: string;
	botId: string | null;
	sourceId: string;
}): Promise<number> {
	const result = await syncWebsitePages({
		sql,
		businessId,
		botId,
		sourceId,
		urls: [url],
		prune: false,
	});
	return result.pagesRead > 0 ? result.chunksCurrent : 0;
}

/**
 * Bring every website source of a business up to date with the live site.
 *
 * Incremental: unchanged text is not re-embedded, changed text replaces its old
 * chunk, and text that disappeared from a page that WAS read is removed (see
 * syncWebsitePages for the full contract). This used to delete every chunk of
 * the source and re-embed from scratch, which also meant the live assistant
 * answered from an empty or half-built base for the length of the run.
 *
 * Only `website` sources are touched — curated text and PDFs are never in scope.
 */
export async function retrainWebsiteSources({
	businessId,
}: {
	businessId: string;
}): Promise<{ pagesProcessed: number; chunksCreated: number }> {
	const sources = await sql`
		SELECT id, url, name, bot_id FROM "ContentSource"
		WHERE business_id = ${businessId}
		  AND type = 'website'
	`;

	let totalPages = 0;
	let totalChunks = 0;

	for (const source of sources) {
		const sourceUrl = source.url as string | null;
		const baseUrl = source.name as string;

		const allowlist = allowlistFor(businessId, baseUrl);
		let pageUrls: string[] = allowlist ? [...allowlist] : [];

		if (!allowlist) {
			try {
				const xml = sourceUrl ? await fetchSitemap(sourceUrl) : null;
				if (xml) {
					pageUrls = await extractUrlsFromSitemap(xml, MAX_RETRAIN_PAGES);
				}
			} catch {
				// Sitemap fetch failed; the crawl fallback below still applies.
			}
			if (pageUrls.length === 0) {
				pageUrls = await crawlForLinks(baseUrl, MAX_RETRAIN_PAGES).catch(
					() => [],
				);
			}
		}

		/**
		 * Discovery returning nothing means the sitemap was unreachable or the
		 * crawl failed — never that the site genuinely has no pages. Pruning on
		 * that signal would trade a working knowledge base for an empty one.
		 */
		if (pageUrls.length === 0) {
			console.error(
				`[retrain] ${baseUrl}: discovered 0 pages — leaving source ${source.id} untouched`,
			);
			continue;
		}

		const result = await syncWebsitePages({
			sql,
			businessId,
			botId: await botIdFor(businessId, source.bot_id as string | null),
			sourceId: source.id as string,
			urls: pageUrls,
			prune: true,
		});

		console.log(
			`[retrain] ${baseUrl}: ${result.pagesRead}/${pageUrls.length} pages read, ` +
				`${result.chunksInserted} new, ${result.chunksUnchanged} unchanged, ` +
				`${result.chunksDeleted} removed` +
				(result.pagesFailed.length
					? `; unreadable (kept as-is): ${result.pagesFailed.join(", ")}`
					: ""),
		);

		totalPages += result.pagesRead;
		totalChunks += result.chunksInserted;

		if (result.pagesRead > 0) {
			await sql`
				UPDATE "ContentSource"
				SET status = 'processed', page_count = ${result.pagesRead},
					processed_at = NOW(), error_message = ${
						result.pagesFailed.length
							? `unreadable on last run: ${result.pagesFailed.join(", ")}`.slice(
									0,
									1000,
								)
							: null
					}
				WHERE id = ${source.id} AND business_id = ${businessId}
			`;
		}
	}

	return { pagesProcessed: totalPages, chunksCreated: totalChunks };
}
