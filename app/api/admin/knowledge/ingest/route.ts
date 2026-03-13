import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import * as cheerio from "cheerio";
import postgres from "postgres";
import { parseStringPromise } from "xml2js";
import { requirePermission } from "@/lib/auth";

const sql = postgres(process.env.POSTGRES_URL!);

export const maxDuration = 300; // 5 minutes for ingestion

const MAX_PAGES = 20; // Limit pages during onboarding to stay within timeout
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const USER_AGENT = "ConversoBot/1.0 (+https://converso.chat)";

// Candidate sitemap paths to try when given a bare domain
const SITEMAP_CANDIDATES = [
	"/sitemap.xml",
	"/sitemap-index.xml",
	"/sitemap-0.xml",
	"/sitemap_index.xml",
];

/**
 * Normalize user input into a base URL.
 */
function parseInput(input: string): {
	baseUrl: string;
	isDirectSitemap: boolean;
} {
	let url = input.trim();

	if (!/^https?:\/\//i.test(url)) {
		url = `https://${url}`;
	}

	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			throw new Error("INVALID_URL");
		}

		const isSitemap = /sitemap.*\.xml$/i.test(parsed.pathname);
		if (isSitemap) {
			return { baseUrl: `${parsed.origin}`, isDirectSitemap: true };
		}

		return { baseUrl: `${parsed.origin}`, isDirectSitemap: false };
	} catch {
		throw new Error("INVALID_URL");
	}
}

async function fetchSitemap(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT },
			signal: AbortSignal.timeout(10000),
		});
		if (!res.ok) return null;
		const text = await res.text();
		if (!text.includes("<urlset") && !text.includes("<sitemapindex")) {
			return null;
		}
		return text;
	} catch {
		return null;
	}
}

async function discoverSitemap(
	baseUrl: string,
	userInput: string,
): Promise<{ xml: string; sitemapUrl: string } | null> {
	const inputUrl = userInput.trim().startsWith("http")
		? userInput.trim()
		: `https://${userInput.trim()}`;

	if (/sitemap.*\.xml/i.test(inputUrl)) {
		const xml = await fetchSitemap(inputUrl);
		if (xml) return { xml, sitemapUrl: inputUrl };
	}

	for (const path of SITEMAP_CANDIDATES) {
		const url = `${baseUrl}${path}`;
		const xml = await fetchSitemap(url);
		if (xml) return { xml, sitemapUrl: url };
	}

	try {
		const robotsRes = await fetch(`${baseUrl}/robots.txt`, {
			signal: AbortSignal.timeout(5000),
		});
		if (robotsRes.ok) {
			const robotsTxt = await robotsRes.text();
			const sitemapMatch = robotsTxt.match(/Sitemap:\s*(.+)/i);
			if (sitemapMatch) {
				const sitemapUrl = sitemapMatch[1].trim();
				const xml = await fetchSitemap(sitemapUrl);
				if (xml) return { xml, sitemapUrl };
			}
		}
	} catch {
		// robots.txt not available
	}

	return null;
}

async function extractUrlsFromSitemap(
	xml: string,
	baseUrl: string,
): Promise<string[]> {
	const result = await parseStringPromise(xml);
	const urls: string[] = [];

	if (result.urlset?.url) {
		for (const entry of result.urlset.url) {
			if (entry.loc?.[0]) urls.push(entry.loc[0]);
		}
	}

	if (result.sitemapindex?.sitemap) {
		const firstSitemap = result.sitemapindex.sitemap[0]?.loc?.[0];
		if (firstSitemap) {
			const childXml = await fetchSitemap(firstSitemap);
			if (childXml) {
				const childResult = await parseStringPromise(childXml);
				if (childResult.urlset?.url) {
					for (const entry of childResult.urlset.url) {
						if (entry.loc?.[0]) urls.push(entry.loc[0]);
					}
				}
			}
		}
	}

	if (urls.length === 0) {
		const locRegex = /<loc>(.*?)<\/loc>/g;
		for (const match of xml.matchAll(locRegex)) {
			if (match[1]) urls.push(match[1].trim());
		}
	}

	return urls.slice(0, MAX_PAGES);
}

async function crawlForLinks(baseUrl: string): Promise<string[]> {
	const origin = new URL(baseUrl).origin;
	const visited = new Set<string>();
	const queue: string[] = [`${origin}/`];
	const discovered: string[] = [];

	const SKIP_PATTERNS = [
		/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|pdf|zip)$/i,
		/\/(wp-admin|wp-includes|wp-json|feed|xmlrpc|cart|checkout|account)\//i,
		/#/,
	];

	while (queue.length > 0 && discovered.length < MAX_PAGES) {
		const url = queue.shift()!;
		const normalized = url.split("?")[0].split("#")[0].replace(/\/$/, "");

		if (visited.has(normalized)) continue;
		visited.add(normalized);

		try {
			const res = await fetch(url, {
				headers: { "User-Agent": USER_AGENT },
				signal: AbortSignal.timeout(10000),
			});
			if (!res.ok) continue;

			const contentType = res.headers.get("content-type") || "";
			if (!contentType.includes("text/html")) continue;

			const html = await res.text();
			discovered.push(url);

			const $ = cheerio.load(html);
			$("a[href]").each((_i, el) => {
				if (discovered.length + queue.length >= MAX_PAGES * 2) return;

				const href = $(el).attr("href");
				if (!href) return;

				try {
					const resolved = new URL(href, url);
					if (resolved.origin !== origin) return;

					const clean = resolved.href
						.split("?")[0]
						.split("#")[0]
						.replace(/\/$/, "");
					if (visited.has(clean)) return;
					if (SKIP_PATTERNS.some((p) => p.test(clean))) return;

					queue.push(resolved.href);
				} catch {
					// Invalid URL, skip
				}
			});
		} catch {
			// Failed to fetch, skip
		}
	}

	return discovered.slice(0, MAX_PAGES);
}

async function scrapePage(
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

function chunkContent(content: string): string[] {
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
			chunksCreated: number;
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

					const sitemapResult = await discoverSitemap(baseUrl, input);
					let pageUrls: string[];
					let sitemapUrl: string | null = null;
					let discoveryMethod: "sitemap" | "crawl";

					if (sitemapResult) {
						sitemapUrl = sitemapResult.sitemapUrl;
						pageUrls = await extractUrlsFromSitemap(sitemapResult.xml, baseUrl);
						discoveryMethod = "sitemap";
					} else {
						pageUrls = await crawlForLinks(baseUrl);
						discoveryMethod = "crawl";
					}

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

					// Deduplicate
					const existingSources = await sql`
						SELECT id FROM "ContentSource"
						WHERE business_id = ${user.businessId}
						  AND type = 'website'
						  AND name = ${baseUrl}
					`;

					if (existingSources.length > 0) {
						const sourceIds = existingSources.map((s) => s.id);
						await sql`DELETE FROM "KnowledgeChunk" WHERE source_id = ANY(${sourceIds})`;
						await sql`DELETE FROM "ContentSource" WHERE id = ANY(${sourceIds})`;
					}

					const [source] = await sql`
						INSERT INTO "ContentSource" (business_id, type, name, url, status)
						VALUES (${user.businessId}, 'website', ${baseUrl}, ${sitemapUrl || baseUrl}, 'processing')
						RETURNING id
					`;

					let totalChunks = 0;
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
							try {
								const { embedding } = await embed({
									model: openai.embedding("text-embedding-3-small"),
									value: chunks[ci],
								});

								await sql`
									INSERT INTO "KnowledgeChunk" (
										business_id, bot_id, source_id, content, embedding, metadata
									) VALUES (
										${user.businessId},
										${user.botId},
										${source.id},
										${chunks[ci]},
										${JSON.stringify(embedding)},
										${JSON.stringify({
											url: pageUrl,
											title: pageData.title,
											section: `chunk_${ci}`,
											language: "auto",
										})}
									)
								`;
								totalChunks++;
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

					await sql`
						UPDATE "ContentSource"
						SET status = 'processed', page_count = ${pagesProcessed}, processed_at = NOW()
						WHERE id = ${source.id}
					`;

					await send({
						type: "complete",
						pagesProcessed,
						chunksCreated: totalChunks,
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
		let pageUrls: string[];
		let sitemapUrl: string | null = null;
		let discoveryMethod: "sitemap" | "crawl";

		const sitemapResult = await discoverSitemap(baseUrl, input);
		if (sitemapResult) {
			sitemapUrl = sitemapResult.sitemapUrl;
			pageUrls = await extractUrlsFromSitemap(sitemapResult.xml, baseUrl);
			discoveryMethod = "sitemap";
		} else {
			pageUrls = await crawlForLinks(baseUrl);
			discoveryMethod = "crawl";
		}

		if (pageUrls.length === 0) {
			return Response.json(
				{
					error: "NO_PAGES_FOUND",
					message: `Could not find any pages to import from ${baseUrl}. Check that the URL is correct and the site is publicly accessible.`,
				},
				{ status: 404 },
			);
		}

		// Deduplicate
		const existingSources = await sql`
			SELECT id FROM "ContentSource"
			WHERE business_id = ${user.businessId}
			  AND type = 'website'
			  AND name = ${baseUrl}
		`;

		if (existingSources.length > 0) {
			const sourceIds = existingSources.map((s) => s.id);
			await sql`DELETE FROM "KnowledgeChunk" WHERE source_id = ANY(${sourceIds})`;
			await sql`DELETE FROM "ContentSource" WHERE id = ANY(${sourceIds})`;
		}

		const [source] = await sql`
			INSERT INTO "ContentSource" (business_id, type, name, url, status)
			VALUES (${user.businessId}, 'website', ${baseUrl}, ${sitemapUrl || baseUrl}, 'processing')
			RETURNING id
		`;

		let totalChunks = 0;
		let pagesProcessed = 0;

		for (let i = 0; i < pageUrls.length; i++) {
			const pageUrl = pageUrls[i];
			const pageData = await scrapePage(pageUrl);
			if (!pageData) continue;

			const chunks = chunkContent(pageData.content);
			pagesProcessed++;

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
							${user.businessId},
							${user.botId},
							${source.id},
							${chunks[ci]},
							${JSON.stringify(embedding)},
							${JSON.stringify({
								url: pageUrl,
								title: pageData.title,
								section: `chunk_${ci}`,
								language: "auto",
							})}
						)
					`;
					totalChunks++;
				} catch (embedErr) {
					console.error(
						`[ingest] Failed to embed chunk ${ci} of ${pageUrl}:`,
						embedErr,
					);
				}
			}
		}

		await sql`
			UPDATE "ContentSource"
			SET status = 'processed', page_count = ${pagesProcessed}, processed_at = NOW()
			WHERE id = ${source.id}
		`;

		return Response.json({
			success: true,
			pagesProcessed,
			chunksCreated: totalChunks,
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
