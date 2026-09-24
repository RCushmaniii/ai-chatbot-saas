import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import postgres from "postgres";
import { requirePermission } from "@/lib/auth";
import {
	chunkContent,
	discoverPages,
	hashContent,
	parseInput,
	scrapePage,
} from "@/lib/ingest/site";

const sql = postgres(process.env.POSTGRES_URL!);

export const maxDuration = 300; // 5 minutes for ingestion

/**
 * Pages per run, through the DASHBOARD.
 *
 * This is a property of the runtime, not of the task: Vercel kills the function
 * at maxDuration above, and 20 pages is what reliably fits. It is NOT a limit on
 * what the product can index — scripts/ingest-site.ts runs the same scraper with
 * no timeout and took cushlabs.ai's full 133-page sitemap, the same way the
 * sibling ny-ai-chatbot repo indexes 476 pages of nyenglishteacher.com.
 *
 * Scraping, sitemap discovery and chunking now live in lib/ingest/site.ts and
 * are shared with that script, so the button and the command line cannot answer
 * the same question differently.
 */
const MAX_PAGES = 20;

/**
 * NDJSON progress event types sent during streaming ingestion.
 */
type ProgressEvent =
	| { type: "discovering" }
	| { type: "discovered"; totalPages: number; method: "sitemap" | "crawl" }
	| { type: "scraping"; page: number; total: number; url: string }
	| {
			type: "scraped";
			page: number;
			total: number;
			url: string;
			title: string;
			chunks: number;
	  }
	| {
			type: "complete";
			pagesProcessed: number;
			/** Chunks freshly embedded this run (incurred OpenAI cost). */
			chunksCreated: number;
			/** Chunks whose content_hash matched an existing row — skipped, no cost. */
			chunksReused?: number;
			/** Stale chunks deleted because their content no longer appears in the new crawl. */
			orphansDeleted?: number;
			sitemapUrl: string | null;
			discoveryMethod: "sitemap" | "crawl";
	  }
	| { type: "error"; error: string; message: string };

export async function POST(request: Request) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		const body = await request.json();
		const input: string = body.sitemapUrl || body.url || "";
		const useStream = body.stream === true;

		if (!input || typeof input !== "string") {
			return Response.json(
				{ error: "URL_REQUIRED", message: "A website URL is required" },
				{ status: 400 },
			);
		}

		let baseUrl: string;
		try {
			const parsed = parseInput(input);
			baseUrl = parsed.baseUrl;
		} catch {
			return Response.json(
				{
					error: "INVALID_URL",
					message: "Invalid URL. Enter a domain like cushlabs.ai",
				},
				{ status: 400 },
			);
		}

		// For streaming, create a TransformStream and return the readable side
		if (useStream) {
			const encoder = new TextEncoder();
			const stream = new TransformStream();
			const writer = stream.writable.getWriter();

			const send = async (event: ProgressEvent) => {
				await writer.write(encoder.encode(`${JSON.stringify(event)}\n`));
			};

			// Run the ingestion pipeline in the background
			(async () => {
				try {
					await send({ type: "discovering" });

					// One discovery path, shared with scripts/ingest-site.ts so the
					// dashboard button and the command line cannot disagree.
					const discovery = await discoverPages(input, MAX_PAGES);
					const pageUrls = discovery.urls;
					const sitemapUrl = discovery.sitemapUrl ?? null;
					const discoveryMethod = discovery.method;

					if (pageUrls.length === 0) {
						await send({
							type: "error",
							error: "NO_PAGES_FOUND",
							message: `Could not find any pages to import from ${baseUrl}.`,
						});
						await writer.close();
						return;
					}

					await send({
						type: "discovered",
						totalPages: pageUrls.length,
						method: discoveryMethod,
					});

					// Reuse the source row if this URL was ingested before, instead of
					// deleting and recreating. Combined with the content_hash check below,
					// this turns re-ingest into an incremental operation: only NEW or
					// CHANGED chunks pay the OpenAI embedding cost. A 1000-page site
					// where one page changed only embeds the new chunks from that page.
					const existingSources = await sql`
						SELECT id FROM "ContentSource"
						WHERE business_id = ${user.businessId}
						  AND type = 'website'
						  AND name = ${baseUrl}
						LIMIT 1
					`;

					let sourceId: string;
					if (existingSources.length > 0) {
						sourceId = existingSources[0].id;
						await sql`
							UPDATE "ContentSource"
							SET status = 'processing', url = ${sitemapUrl || baseUrl}
							WHERE id = ${sourceId}
						`;
					} else {
						const [source] = await sql`
							INSERT INTO "ContentSource" (business_id, type, name, url, status)
							VALUES (${user.businessId}, 'website', ${baseUrl}, ${sitemapUrl || baseUrl}, 'processing')
							RETURNING id
						`;
						sourceId = source.id;
					}

					// Snapshot existing chunk hashes for this source so we can both
					// (a) skip re-embedding chunks whose content hasn't changed and
					// (b) delete chunks whose content no longer appears in the new crawl.
					const existingChunkRows = await sql`
						SELECT content_hash FROM "KnowledgeChunk"
						WHERE source_id = ${sourceId} AND content_hash IS NOT NULL
					`;
					const existingHashes = new Set(
						existingChunkRows.map((r) => r.content_hash as string),
					);

					const seenHashes = new Set<string>();
					let chunksEmbedded = 0;
					let chunksReused = 0;
					let pagesProcessed = 0;

					for (let i = 0; i < pageUrls.length; i++) {
						const pageUrl = pageUrls[i];
						await send({
							type: "scraping",
							page: i + 1,
							total: pageUrls.length,
							url: pageUrl,
						});

						const pageData = await scrapePage(pageUrl);
						if (!pageData) continue;

						const chunks = chunkContent(pageData.content);
						pagesProcessed++;
						let pageChunks = 0;

						for (let ci = 0; ci < chunks.length; ci++) {
							const chunkHash = hashContent(chunks[ci]);

							// Already embedded for this source — skip the OpenAI call and the
							// INSERT. Marking it as "seen" keeps it safe from orphan cleanup.
							if (existingHashes.has(chunkHash)) {
								seenHashes.add(chunkHash);
								chunksReused++;
								pageChunks++;
								continue;
							}

							// Same hash already produced earlier in THIS run (e.g. duplicate
							// content across two pages of the same site). Skip the second one
							// to avoid wasting an embed call on identical text.
							if (seenHashes.has(chunkHash)) {
								continue;
							}

							try {
								const { embedding } = await embed({
									model: openai.embedding("text-embedding-3-small"),
									value: chunks[ci],
								});

								await sql`
									INSERT INTO "KnowledgeChunk" (
										business_id, bot_id, source_id, content, content_hash, embedding, metadata
									) VALUES (
										${user.businessId},
										${user.botId},
										${sourceId},
										${chunks[ci]},
										${chunkHash},
										${JSON.stringify(embedding)},
										${JSON.stringify({
											url: pageUrl,
											title: pageData.title,
											section: `chunk_${ci}`,
											language: "auto",
										})}
									)
								`;
								seenHashes.add(chunkHash);
								chunksEmbedded++;
								pageChunks++;
							} catch (embedErr) {
								console.error(
									`[ingest] Failed to embed chunk ${ci} of ${pageUrl}:`,
									embedErr,
								);
							}
						}

						await send({
							type: "scraped",
							page: i + 1,
							total: pageUrls.length,
							url: pageUrl,
							title: pageData.title,
							chunks: pageChunks,
						});
					}

					// Orphan cleanup: any chunks under this source whose hash is no longer
					// present in the new crawl are stale (page deleted, content removed).
					const orphanHashes = [...existingHashes].filter(
						(h) => !seenHashes.has(h),
					);
					let orphansDeleted = 0;
					if (orphanHashes.length > 0) {
						await sql`
							DELETE FROM "KnowledgeChunk"
							WHERE source_id = ${sourceId}
							  AND content_hash = ANY(${orphanHashes})
						`;
						orphansDeleted = orphanHashes.length;
					}

					await sql`
						UPDATE "ContentSource"
						SET status = 'processed', page_count = ${pagesProcessed}, processed_at = NOW()
						WHERE id = ${sourceId}
					`;

					await send({
						type: "complete",
						pagesProcessed,
						chunksCreated: chunksEmbedded,
						chunksReused,
						orphansDeleted,
						sitemapUrl,
						discoveryMethod,
					});
				} catch (err) {
					console.error("[ingest] Stream error:", err);
					await send({
						type: "error",
						error: "INGESTION_FAILED",
						message: "An unexpected error occurred during ingestion.",
					});
				} finally {
					await writer.close();
				}
			})();

			return new Response(stream.readable, {
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"Cache-Control": "no-cache",
					"Transfer-Encoding": "chunked",
				},
			});
		}

		// Non-streaming path (original behavior)
		// One discovery path, shared with scripts/ingest-site.ts so the
		// dashboard button and the command line cannot disagree.
		const discovery = await discoverPages(input, MAX_PAGES);
		const pageUrls = discovery.urls;
		const sitemapUrl = discovery.sitemapUrl ?? null;
		const discoveryMethod = discovery.method;

		if (pageUrls.length === 0) {
			return Response.json(
				{
					error: "NO_PAGES_FOUND",
					message: `Could not find any pages to import from ${baseUrl}. Check that the URL is correct and the site is publicly accessible.`,
				},
				{ status: 404 },
			);
		}

		// Reuse the source row instead of delete+recreate — same incremental
		// ingest path as the streaming branch above. See that path for full
		// comments on why content_hash makes re-ingest cheap.
		const existingSources = await sql`
			SELECT id FROM "ContentSource"
			WHERE business_id = ${user.businessId}
			  AND type = 'website'
			  AND name = ${baseUrl}
			LIMIT 1
		`;

		let sourceId: string;
		if (existingSources.length > 0) {
			sourceId = existingSources[0].id;
			await sql`
				UPDATE "ContentSource"
				SET status = 'processing', url = ${sitemapUrl || baseUrl}
				WHERE id = ${sourceId}
			`;
		} else {
			const [source] = await sql`
				INSERT INTO "ContentSource" (business_id, type, name, url, status)
				VALUES (${user.businessId}, 'website', ${baseUrl}, ${sitemapUrl || baseUrl}, 'processing')
				RETURNING id
			`;
			sourceId = source.id;
		}

		const existingChunkRows = await sql`
			SELECT content_hash FROM "KnowledgeChunk"
			WHERE source_id = ${sourceId} AND content_hash IS NOT NULL
		`;
		const existingHashes = new Set(
			existingChunkRows.map((r) => r.content_hash as string),
		);

		const seenHashes = new Set<string>();
		let chunksEmbedded = 0;
		let chunksReused = 0;
		let pagesProcessed = 0;

		for (let i = 0; i < pageUrls.length; i++) {
			const pageUrl = pageUrls[i];
			const pageData = await scrapePage(pageUrl);
			if (!pageData) continue;

			const chunks = chunkContent(pageData.content);
			pagesProcessed++;

			for (let ci = 0; ci < chunks.length; ci++) {
				const chunkHash = hashContent(chunks[ci]);

				if (existingHashes.has(chunkHash)) {
					seenHashes.add(chunkHash);
					chunksReused++;
					continue;
				}

				if (seenHashes.has(chunkHash)) {
					continue;
				}

				try {
					const { embedding } = await embed({
						model: openai.embedding("text-embedding-3-small"),
						value: chunks[ci],
					});

					await sql`
						INSERT INTO "KnowledgeChunk" (
							business_id, bot_id, source_id, content, content_hash, embedding, metadata
						) VALUES (
							${user.businessId},
							${user.botId},
							${sourceId},
							${chunks[ci]},
							${chunkHash},
							${JSON.stringify(embedding)},
							${JSON.stringify({
								url: pageUrl,
								title: pageData.title,
								section: `chunk_${ci}`,
								language: "auto",
							})}
						)
					`;
					seenHashes.add(chunkHash);
					chunksEmbedded++;
				} catch (embedErr) {
					console.error(
						`[ingest] Failed to embed chunk ${ci} of ${pageUrl}:`,
						embedErr,
					);
				}
			}
		}

		// Orphan cleanup — same logic as streaming path
		const orphanHashes = [...existingHashes].filter((h) => !seenHashes.has(h));
		let orphansDeleted = 0;
		if (orphanHashes.length > 0) {
			await sql`
				DELETE FROM "KnowledgeChunk"
				WHERE source_id = ${sourceId}
				  AND content_hash = ANY(${orphanHashes})
			`;
			orphansDeleted = orphanHashes.length;
		}

		await sql`
			UPDATE "ContentSource"
			SET status = 'processed', page_count = ${pagesProcessed}, processed_at = NOW()
			WHERE id = ${sourceId}
		`;

		return Response.json({
			success: true,
			pagesProcessed,
			chunksCreated: chunksEmbedded,
			chunksReused,
			orphansDeleted,
			sitemapUrl,
			discoveryMethod,
		});
	} catch (err: any) {
		console.error("[ingest] Error:", err);
		return Response.json(
			{
				error: "INGESTION_FAILED",
				message: "An unexpected error occurred during ingestion.",
			},
			{ status: 500 },
		);
	}
}
