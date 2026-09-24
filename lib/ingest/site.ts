import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { parseStringPromise } from "xml2js";

/**
 * Sitemap discovery, page scraping and chunking — the parts of website
 * ingestion that have nothing to do with HTTP streaming or database writes.
 *
 * Extracted so the admin route and the CLI script cannot drift apart. Every
 * serious bug found in this product on 2026-09-23 was two copies of one idea
 * disagreeing: two write paths to one knowledge base, two personas for one
 * business, help text describing a table that no longer existed. An ingester
 * that behaves differently depending on whether a human clicked a button or ran
 * a script would be the next one.
 *
 * The page cap is a PARAMETER, not a constant. In the route it exists because
 * Vercel kills the function at 300 seconds; in a CLI script there is no such
 * limit, which is exactly how the sibling ny-ai-chatbot repo indexes 476 pages
 * of nyenglishteacher.com. Baking 20 into the shared code would export a
 * serverless constraint to a context that does not have it.
 */

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;
export const USER_AGENT = "ConversoBot/1.0 (+https://converso.chat)";

/** Candidate sitemap paths to try when given a bare domain. */
const SITEMAP_CANDIDATES = [
	"/sitemap.xml",
	"/sitemap-index.xml",
	"/sitemap-0.xml",
	"/sitemap_index.xml",
];

/** SHA-256 hex digest of chunk content; 64 chars, matching the column width. */
export function hashContent(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

/** Normalize user input into a base URL. */
export function parseInput(input: string): {
	baseUrl: string;
	isDirectSitemap: boolean;
} {
	let url = input.trim();
	if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			throw new Error("INVALID_URL");
		}
		const isSitemap = /sitemap.*\.xml$/i.test(parsed.pathname);
		return { baseUrl: parsed.origin, isDirectSitemap: isSitemap };
	} catch {
		throw new Error("INVALID_URL");
	}
}

export async function fetchSitemap(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT },
			signal: AbortSignal.timeout(10_000),
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

export async function discoverSitemap(
	baseUrl: string,
): Promise<{ xml: string; url: string } | null> {
	for (const path of SITEMAP_CANDIDATES) {
		const candidate = `${baseUrl}${path}`;
		const xml = await fetchSitemap(candidate);
		if (xml) return { xml, url: candidate };
	}
	return null;
}

/**
 * Every URL in a sitemap, following ALL children of a sitemap index.
 *
 * The previous implementation followed only `sitemapindex.sitemap[0]`. A site
 * that splits its sitemap by section — which is what most generators do once a
 * site grows — would silently contribute only its first section, and the run
 * would report success. Silent partial coverage of a knowledge base is the same
 * failure shape as a bot that answers confidently from half the facts.
 *
 * `maxPages` is applied once at the end, after everything is collected, so the
 * cap truncates a complete list rather than an arbitrary first fragment of one.
 */
export async function extractUrlsFromSitemap(
	xml: string,
	maxPages: number,
): Promise<string[]> {
	const urls: string[] = [];

	const collect = (parsed: {
		urlset?: { url?: Array<{ loc?: string[] }> };
	}) => {
		for (const entry of parsed.urlset?.url ?? []) {
			if (entry.loc?.[0]) urls.push(entry.loc[0].trim());
		}
	};

	try {
		const result = await parseStringPromise(xml);
		collect(result);

		for (const child of result.sitemapindex?.sitemap ?? []) {
			const loc = child?.loc?.[0];
			if (!loc) continue;
			const childXml = await fetchSitemap(loc);
			if (!childXml) continue;
			collect(await parseStringPromise(childXml));
		}
	} catch {
		// fall through to the regex below
	}

	if (urls.length === 0) {
		for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
			if (match[1]) urls.push(match[1].trim());
		}
	}

	// De-duplicate: a sitemap index whose children overlap would otherwise pay
	// to embed the same page twice.
	return [...new Set(urls)].slice(0, maxPages);
}

/** Breadth-first same-origin link crawl, for sites with no sitemap. */
export async function crawlForLinks(
	baseUrl: string,
	maxPages: number,
): Promise<string[]> {
	const origin = new URL(baseUrl).origin;
	const visited = new Set<string>();
	const queue: string[] = [`${origin}/`];
	const discovered: string[] = [];

	while (queue.length > 0 && discovered.length < maxPages) {
		const url = queue.shift();
		if (!url || visited.has(url)) continue;
		visited.add(url);

		try {
			const res = await fetch(url, {
				headers: { "User-Agent": USER_AGENT },
				signal: AbortSignal.timeout(10_000),
			});
			if (!res.ok) continue;
			const html = await res.text();
			discovered.push(url);

			const $ = cheerio.load(html);
			$("a[href]").each((_, el) => {
				const href = $(el).attr("href");
				if (!href) return;
				try {
					const next = new URL(href, url);
					if (next.origin !== origin) return;
					next.hash = "";
					const clean = next.toString();
					if (!visited.has(clean) && !queue.includes(clean)) queue.push(clean);
				} catch {
					/* unparseable href */
				}
			});
		} catch {
			/* unreachable page */
		}
	}

	return discovered.slice(0, maxPages);
}

export async function scrapePage(
	url: string,
): Promise<{ title: string; content: string } | null> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT },
			signal: AbortSignal.timeout(15_000),
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

/** Split page text into overlapping chunks on paragraph then sentence bounds. */
export function chunkContent(content: string): string[] {
	const paragraphs = content
		.split(/\n\n+/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	const segments: string[] = [];
	for (const para of paragraphs.length > 1 ? paragraphs : [content]) {
		if (para.length <= CHUNK_SIZE) {
			segments.push(para);
			continue;
		}
		const sentences = para.match(/[^.!?]+[.!?]+\s*/g) || [para];
		for (const sentence of sentences) {
			if (sentence.length <= CHUNK_SIZE) {
				segments.push(sentence.trim());
				continue;
			}
			let start = 0;
			while (start < sentence.length) {
				const end = Math.min(start + CHUNK_SIZE, sentence.length);
				segments.push(sentence.slice(start, end).trim());
				start += CHUNK_SIZE - CHUNK_OVERLAP;
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

/** Discover every page for a site, by sitemap if there is one, else by crawl. */
export async function discoverPages(
	input: string,
	maxPages: number,
): Promise<{
	urls: string[];
	method: "sitemap" | "crawl";
	sitemapUrl?: string;
}> {
	const { baseUrl, isDirectSitemap } = parseInput(input);

	if (isDirectSitemap) {
		const xml = await fetchSitemap(input);
		if (xml) {
			return {
				urls: await extractUrlsFromSitemap(xml, maxPages),
				method: "sitemap",
				sitemapUrl: input,
			};
		}
	}

	const found = await discoverSitemap(baseUrl);
	if (found) {
		return {
			urls: await extractUrlsFromSitemap(found.xml, maxPages),
			method: "sitemap",
			sitemapUrl: found.url,
		};
	}

	return { urls: await crawlForLinks(baseUrl, maxPages), method: "crawl" };
}
