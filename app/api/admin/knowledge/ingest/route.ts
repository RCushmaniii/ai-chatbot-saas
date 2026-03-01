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

// Candidate sitemap paths to try when given a bare domain
const SITEMAP_CANDIDATES = [
	"/sitemap.xml",
	"/sitemap-index.xml",
	"/sitemap-0.xml",
	"/sitemap_index.xml",
];

/**
 * Normalize user input into a base URL.
 * Accepts: "cushlabs.ai", "www.cushlabs.ai", "https://cushlabs.ai",
 *          "https://cushlabs.ai/sitemap.xml"
 */
function parseInput(input: string): {
	baseUrl: string;
	isDirectSitemap: boolean;
} {
	let url = input.trim();

	// Add protocol if missing
	if (!/^https?:\/\//i.test(url)) {
		url = `https://${url}`;
	}

	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			throw new Error("INVALID_URL");
		}

		// If the path looks like a sitemap file, treat it as a direct sitemap URL
		const isSitemap = /sitemap.*\.xml$/i.test(parsed.pathname);
		if (isSitemap) {
			return { baseUrl: `${parsed.origin}`, isDirectSitemap: true };
		}

		return {
			baseUrl: `${parsed.origin}`,
			isDirectSitemap: false,
		};
	} catch {
		throw new Error("INVALID_URL");
	}
}

/**
 * Try to fetch a sitemap from the given URL. Returns the XML text or null.
 */
async function fetchSitemap(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": "ConversoBot/1.0 (+https://converso.chat)" },
			signal: AbortSignal.timeout(10000),
		});
		if (!res.ok) return null;
		const text = await res.text();
		// Basic sanity check — should contain XML-like content
		if (!text.includes("<urlset") && !text.includes("<sitemapindex")) {
			return null;
		}
		return text;
	} catch {
		return null;
	}
}

/**
 * Discover a sitemap for the given base URL.
 * If the user provided a direct sitemap URL, try that first.
 * Otherwise, try common sitemap paths and fall back to robots.txt.
 */
async function discoverSitemap(
	baseUrl: string,
	userInput: string,
): Promise<{ xml: string; sitemapUrl: string }> {
	// If user provided a direct sitemap URL, try it first
	const inputUrl = userInput.trim().startsWith("http")
		? userInput.trim()
		: `https://${userInput.trim()}`;

	if (/sitemap.*\.xml/i.test(inputUrl)) {
		const xml = await fetchSitemap(inputUrl);
		if (xml) return { xml, sitemapUrl: inputUrl };
	}

	// Try common sitemap paths
	for (const path of SITEMAP_CANDIDATES) {
		const url = `${baseUrl}${path}`;
		const xml = await fetchSitemap(url);
		if (xml) return { xml, sitemapUrl: url };
	}

	// Try robots.txt as last resort
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

	throw new Error("NO_SITEMAP_FOUND");
}

/**
 * Parse sitemap XML and extract page URLs.
 * Handles both urlset and sitemapindex formats.
 */
async function extractUrlsFromSitemap(
	xml: string,
	baseUrl: string,
): Promise<string[]> {
	const result = await parseStringPromise(xml);
	const urls: string[] = [];

	// Standard urlset
	if (result.urlset?.url) {
		for (const entry of result.urlset.url) {
			if (entry.loc?.[0]) {
				urls.push(entry.loc[0]);
			}
		}
	}

	// Sitemap index — fetch first child sitemap only (to stay within limits)
	if (result.sitemapindex?.sitemap) {
		const firstSitemap = result.sitemapindex.sitemap[0]?.loc?.[0];
		if (firstSitemap) {
			const childXml = await fetchSitemap(firstSitemap);
			if (childXml) {
				const childResult = await parseStringPromise(childXml);
				if (childResult.urlset?.url) {
					for (const entry of childResult.urlset.url) {
						if (entry.loc?.[0]) {
							urls.push(entry.loc[0]);
						}
					}
				}
			}
		}
	}

	// If XML parsing yielded nothing, try regex as fallback
	if (urls.length === 0) {
		const locRegex = /<loc>(.*?)<\/loc>/g;
		for (const match of xml.matchAll(locRegex)) {
			if (match[1]) urls.push(match[1].trim());
		}
	}

	return urls.slice(0, MAX_PAGES);
}

/**
 * Scrape a single page and return its text content.
 */
async function scrapePage(
	url: string,
): Promise<{ title: string; content: string } | null> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": "ConversoBot/1.0 (+https://converso.chat)" },
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
 * Split content into overlapping chunks.
 */
function chunkContent(content: string): string[] {
	const chunks: string[] = [];
	let start = 0;
	while (start < content.length) {
		const end = Math.min(start + CHUNK_SIZE, content.length);
		chunks.push(content.slice(start, end));
		start += CHUNK_SIZE - CHUNK_OVERLAP;
	}
	return chunks;
}

export async function POST(request: Request) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		const body = await request.json();
		const input: string = body.sitemapUrl || body.url || "";

		if (!input || typeof input !== "string") {
			return Response.json(
				{ error: "URL_REQUIRED", message: "A website URL is required" },
				{ status: 400 },
			);
		}

		// 1. Parse user input (domain or sitemap URL)
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

		// 2. Discover sitemap
		let sitemapXml: string;
		let sitemapUrl: string;
		try {
			const result = await discoverSitemap(baseUrl, input);
			sitemapXml = result.xml;
			sitemapUrl = result.sitemapUrl;
		} catch {
			return Response.json(
				{
					error: "NO_SITEMAP_FOUND",
					message: `No sitemap found at ${baseUrl}. The website needs a sitemap.xml file.`,
				},
				{ status: 404 },
			);
		}

		console.log(
			`[ingest] Found sitemap: ${sitemapUrl} for business: ${user.businessId}`,
		);

		// 3. Extract URLs from sitemap
		const pageUrls = await extractUrlsFromSitemap(sitemapXml, baseUrl);
		if (pageUrls.length === 0) {
			return Response.json(
				{
					error: "EMPTY_SITEMAP",
					message: "The sitemap was found but contains no page URLs.",
				},
				{ status: 422 },
			);
		}

		console.log(`[ingest] Found ${pageUrls.length} URLs to process`);

		// 4. Create a ContentSource record
		const [source] = await sql`
			INSERT INTO "ContentSource" (business_id, type, name, url, status)
			VALUES (${user.businessId}, 'website', ${baseUrl}, ${sitemapUrl}, 'processing')
			RETURNING id
		`;

		// 5. Scrape pages, chunk, embed, and store
		let totalChunks = 0;
		let pagesProcessed = 0;

		for (let i = 0; i < pageUrls.length; i++) {
			const pageUrl = pageUrls[i];
			console.log(
				`[ingest] [${i + 1}/${pageUrls.length}] Scraping: ${pageUrl}`,
			);

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

		// 6. Update ContentSource status
		await sql`
			UPDATE "ContentSource"
			SET status = 'processed', page_count = ${pagesProcessed}, processed_at = NOW()
			WHERE id = ${source.id}
		`;

		console.log(
			`[ingest] Done. Pages: ${pagesProcessed}, Chunks: ${totalChunks}`,
		);

		return Response.json({
			success: true,
			pagesProcessed,
			chunksCreated: totalChunks,
			sitemapUrl,
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
