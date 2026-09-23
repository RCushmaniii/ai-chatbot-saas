import postgres from "postgres";
import { requirePermission } from "@/lib/auth";

const client = postgres(process.env.POSTGRES_URL!);

/**
 * Knowledge-base counts for the admin UI.
 *
 * THIS ENDPOINT HAS NEVER WORKED. It counted rows in `website_content`
 * `WHERE business_id = …`, and `website_content` has no `business_id` column —
 * Postgres raises 42703, the catch below swallows it, and every caller gets a
 * 500. The "Load Knowledge Base Stats" button on the Website tab therefore
 * showed an em dash for every user of this product since it shipped.
 *
 * That matters more than a broken button. On 2026-09-23 the owner opened this
 * console, saw those dashes, and concluded the product was dead. The dashes had
 * nothing to do with his account being empty; nothing was ever counted for
 * anyone. A failure that renders as a plausible zero is worse than an error
 * message, because nobody files a bug about an empty state.
 *
 * `website_content` is the older, single-tenant store: 3,901 rows of scraped
 * pages with no tenant column at all, read only by /api/knowledge/search. It is
 * NOT what the current ingestion path writes to and NOT what the widget reads,
 * so counting it here was wrong on two axes. The tables that actually hold this
 * account's knowledge are KnowledgeChunk (written by the admin ingest route and
 * by the provisioning scripts) and Document_Knowledge (the legacy manual store,
 * which IS tenant-scoped).
 *
 * Counts are split by content source type so "scraped from the web" and "added
 * by hand" stay distinguishable, which is the distinction the UI is drawing.
 */
export async function GET() {
	try {
		const { user, error } = await requirePermission("knowledge:view");
		if (error) return error;

		const [websiteResult, manualChunkResult, legacyManualResult] =
			await Promise.all([
				client`
          SELECT COUNT(*)::int AS count
          FROM "KnowledgeChunk" k
          JOIN "ContentSource" s ON s.id = k.source_id
          WHERE k.business_id = ${user.businessId}
            AND s.type = 'website'
        `,
				client`
          SELECT COUNT(*)::int AS count
          FROM "KnowledgeChunk" k
          LEFT JOIN "ContentSource" s ON s.id = k.source_id
          WHERE k.business_id = ${user.businessId}
            AND (s.type IS NULL OR s.type <> 'website')
        `,
				client`
          SELECT COUNT(*)::int AS count
          FROM "Document_Knowledge"
          WHERE business_id = ${user.businessId}
        `,
			]);

		return Response.json({
			websiteContent: Number(websiteResult[0]?.count ?? 0),
			manualContent:
				Number(manualChunkResult[0]?.count ?? 0) +
				Number(legacyManualResult[0]?.count ?? 0),
		});
	} catch (error) {
		console.error("Error fetching knowledge base stats:", error);
		return Response.json({ error: "Failed to fetch stats" }, { status: 500 });
	}
}
