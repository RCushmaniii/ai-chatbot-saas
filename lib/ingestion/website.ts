import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import * as cheerio from "cheerio";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!);

const USER_AGENT = "ConversoBot/1.0 (+https://converso.chat)";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Scrape a single page and return its text content.
 */
export async function scrapePage(
	url: string,
): Promise<{ title: string; content: string } | null> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT },
			signal: AbortSignal.timeout(15000),
		});
		if (!res.ok) return null;

		const html = await res.text();
		const $ = cheerio.load(html);

		// Remove non-content elements
		$(
			"script, style, nav, footer, header, iframe, noscript, svg, [role='navigation']",
		).remove();

		const title = $("title").text().trim();
		const content = $("main, article, [role='main'], body")
			.first()
			.text()
			.replace(/\s+/g, " ")
			.trim();

		if (!content || content.length < 50) return null;
		return { title, content };
	} catch {
		return null;
	}
}

/**
 * Paragraph-aware content chunking.
 */
export function chunkContent(content: string): string[] {
	const paragraphs = content
		.split(/\n\n+/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	const segments: string[] = [];
	for (const para of paragraphs.length > 1 ? paragraphs : [content]) {
		if (para.length <= CHUNK_SIZE) {
			segments.push(para);
		} else {
			const sentences = para.match(/[^.!?]+[.!?]+\s*/g) || [para];
			for (const sentence of sentences) {
				if (sentence.length <= CHUNK_SIZE) {
					segments.push(sentence.trim());
				} else {
					let start = 0;
					while (start < sentence.length) {
						const end = Math.min(start + CHUNK_SIZE, sentence.length);
						segments.push(sentence.slice(start, end).trim());
						start += CHUNK_SIZE - CHUNK_OVERLAP;
					}
				}
			}
		}
	}

	const chunks: string[] = [];
	let current = "";

	for (const segment of segments) {
		if (current.length + segment.length + 1 <= CHUNK_SIZE) {
			current = current ? `${current} ${segment}` : segment;
		} else {
			if (current) chunks.push(current);
			current = segment;
		}
	}
	if (current) chunks.push(current);

	if (chunks.length > 1 && CHUNK_OVERLAP > 0) {
		const overlapped: string[] = [chunks[0]];
		for (let i = 1; i < chunks.length; i++) {
			const prevTail = chunks[i - 1].slice(-CHUNK_OVERLAP);
			overlapped.push(`${prevTail} ${chunks[i]}`);
		}
		return overlapped;
	}

	return chunks;
}

/**
 * Scrape a page, chunk its content, generate embeddings, and store in KnowledgeChunk.
 * Returns the number of chunks created.
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
	const pageData = await scrapePage(url);
	if (!pageData) return 0;

	const chunks = chunkContent(pageData.content);
	let stored = 0;

	for (let ci = 0; ci < chunks.length; ci++) {
		try {
			const { embedding } = await embed({
				model: openai.embedding("text-embedding-3-small"),
				value: chunks[ci],
			});

			await sql`
				INSERT INTO "KnowledgeChunk" (
					business_id, bot_id, source_id, content, embedding, metadata
				) VALUES (
					${businessId},
					${botId},
					${sourceId},
					${chunks[ci]},
					${JSON.stringify(embedding)},
					${JSON.stringify({
						url,
						title: pageData.title,
						section: `chunk_${ci}`,
						language: "auto",
					})}
				)
			`;
			stored++;
		} catch (embedErr) {
			console.error(
				`[scrapeAndEmbed] Failed to embed chunk ${ci} of ${url}:`,
				embedErr,
			);
		}
	}

	return stored;
}

/**
 * Retrain a business's website knowledge: delete old chunks, re-scrape, re-embed.
 * Only processes website ContentSources (preserves PDF and manual text).
 */
export async function retrainWebsiteSources({
	businessId,
}: {
	businessId: string;
}): Promise<{ pagesProcessed: number; chunksCreated: number }> {
	// Get all website sources for this business
	const sources = await sql`
		SELECT id, url, name FROM "ContentSource"
		WHERE business_id = ${businessId}
		  AND type = 'website'
	`;

	if (sources.length === 0) {
		return { pagesProcessed: 0, chunksCreated: 0 };
	}

	let totalPages = 0;
	let totalChunks = 0;

	for (const source of sources) {
		// Delete existing chunks for this source
		await sql`
			DELETE FROM "KnowledgeChunk"
			WHERE source_id = ${source.id}
		`;

		// Get the sitemap or base URL to discover pages
		const sourceUrl = source.url as string;
		const baseUrl = source.name as string;

		// Try fetching the sitemap URL
		let pageUrls: string[] = [];
		try {
			const res = await fetch(sourceUrl, {
				headers: { "User-Agent": USER_AGENT },
				signal: AbortSignal.timeout(10000),
			});
			if (res.ok) {
				const text = await res.text();
				if (text.includes("<urlset") || text.includes("<sitemapindex")) {
					const locRegex = /<loc>(.*?)<\/loc>/g;
					for (const match of text.matchAll(locRegex)) {
						if (match[1]) pageUrls.push(match[1].trim());
					}
				}
			}
		} catch {
			// Sitemap fetch failed
		}

		// If no sitemap pages found, try crawling the base URL
		if (pageUrls.length === 0) {
			// Crawl by fetching homepage and extracting links
			try {
				const res = await fetch(baseUrl, {
					headers: { "User-Agent": USER_AGENT },
					signal: AbortSignal.timeout(10000),
				});
				if (res.ok) {
					const html = await res.text();
					const $ = cheerio.load(html);
					const origin = new URL(baseUrl).origin;

					$("a[href]").each((_i, el) => {
						const href = $(el).attr("href");
						if (!href) return;
						try {
							const resolved = new URL(href, baseUrl);
							if (resolved.origin === origin) {
								const clean = resolved.href.split("?")[0].split("#")[0];
								if (!pageUrls.includes(clean)) {
									pageUrls.push(clean);
								}
							}
						} catch {
							// Invalid URL
						}
					});

					// Add homepage itself
					if (!pageUrls.includes(baseUrl)) {
						pageUrls.unshift(baseUrl);
					}
				}
			} catch {
				// Crawl failed
			}
		}

		pageUrls = pageUrls.slice(0, 20);

		// Get bot_id from existing chunks metadata or use null
		const botResult = await sql`
			SELECT DISTINCT bot_id FROM "KnowledgeChunk"
			WHERE business_id = ${businessId}
			LIMIT 1
		`;
		const botId = botResult[0]?.bot_id ?? null;

		// Re-scrape and embed each page
		let pagesForSource = 0;
		for (const pageUrl of pageUrls) {
			const chunks = await scrapeAndEmbedPage({
				url: pageUrl,
				businessId,
				botId,
				sourceId: source.id,
			});
			if (chunks > 0) {
				pagesForSource++;
				totalChunks += chunks;
			}
		}

		totalPages += pagesForSource;

		// Update source status
		await sql`
			UPDATE "ContentSource"
			SET status = 'processed', page_count = ${pagesForSource}, processed_at = NOW()
			WHERE id = ${source.id}
		`;
	}

	return { pagesProcessed: totalPages, chunksCreated: totalChunks };
}
