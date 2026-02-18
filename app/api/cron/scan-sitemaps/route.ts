import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import {
	createSitemapScan,
	createTrainingSuggestionsBulk,
	getLatestSitemapScan,
} from "@/lib/db/queries-retraining";
import { contentSource } from "@/lib/db/schema";

// Vercel Cron configuration
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
	try {
		const response = await fetch(sitemapUrl);
		const text = await response.text();

		// Parse XML to extract URLs
		const urlRegex = /<loc>(.*?)<\/loc>/g;
		const urls: string[] = [];

		for (const match of text.matchAll(urlRegex)) {
			urls.push(match[1]);
		}

		return urls;
	} catch (error) {
		console.error(`Error fetching sitemap ${sitemapUrl}:`, error);
		return [];
	}
}

export async function GET(request: Request) {
	try {
		// Verify Vercel Cron secret (sent as Authorization: Bearer <CRON_SECRET>)
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET;
		if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get all website content sources with sitemap URLs
		const websiteSources = await db
			.select()
			.from(contentSource)
			.where(eq(contentSource.type, "website"));

		console.log(`[Cron] Scanning ${websiteSources.length} website sources`);

		const results = [];

		for (const source of websiteSources) {
			if (!source.url) continue;

			try {
				// Try to find sitemap URL
				const sitemapUrl = source.url.endsWith("/")
					? `${source.url}sitemap.xml`
					: `${source.url}/sitemap.xml`;

				// Fetch current sitemap
				const currentUrls = await fetchSitemapUrls(sitemapUrl);

				if (currentUrls.length === 0) {
					console.log(`[Cron] No URLs found in sitemap for ${source.url}`);
					continue;
				}

				// Get previous scan
				const previousScan = await getLatestSitemapScan({
					businessId: source.businessId,
				});

				const previousUrls = previousScan?.scanResults?.existingUrls || [];

				// Calculate differences
				const newUrls = currentUrls.filter(
					(url) => !previousUrls.includes(url),
				);
				const removedUrls = previousUrls.filter(
					(url: string) => !currentUrls.includes(url),
				);

				// Create scan record
				const scan = await createSitemapScan({
					businessId: source.businessId,
					sitemapUrl,
					pagesFound: currentUrls.length,
					newPages: newUrls.length,
					removedPages: removedUrls.length,
					scanResults: {
						existingUrls: currentUrls,
						newUrls,
						removedUrls,
					},
				});

				// Create training suggestions for new and removed pages
				const suggestions = [
					...newUrls.map((url) => ({
						businessId: source.businessId,
						scanId: scan.id,
						type: "new_page" as const,
						url,
					})),
					...removedUrls.map((url: string) => ({
						businessId: source.businessId,
						scanId: scan.id,
						type: "removed_page" as const,
						url,
					})),
				];

				if (suggestions.length > 0) {
					await createTrainingSuggestionsBulk({ suggestions });
				}

				results.push({
					businessId: source.businessId,
					sourceId: source.id,
					pagesFound: currentUrls.length,
					newPages: newUrls.length,
					removedPages: removedUrls.length,
					suggestionsCreated: suggestions.length,
				});
			} catch (error) {
				console.error(`[Cron] Error scanning ${source.url}:`, error);
				results.push({
					businessId: source.businessId,
					sourceId: source.id,
					error: String(error),
				});
			}
		}

		return NextResponse.json({
			scanned: websiteSources.length,
			results,
		});
	} catch (error) {
		console.error("[Cron] Sitemap scan cron failed:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
