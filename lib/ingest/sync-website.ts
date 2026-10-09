import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import type postgres from "postgres";
import { pageToChunks, websiteChunkId } from "./page-sections";
import { hashContent, USER_AGENT } from "./site";

/**
 * Make one website ContentSource hold exactly the current text of a set of
 * pages — no more, no less — paying to embed only what changed.
 *
 * This is the ONE write path for website knowledge that runs unattended (the
 * retrain cron, the admin "run retraining" button, an accepted page suggestion,
 * and scripts/ingest-site.ts). It replaced a retrain that deleted every chunk of
 * a source and re-embedded the first 20 sitemap pages from scratch each run.
 *
 * HOW "REPLACE, NOT DUPLICATE" IS GUARANTEED
 *
 * Every row's id is derived from (source, page URL, chunk text). The same text
 * on the same page is always the same row, so a re-run inserts with
 * ON CONFLICT DO NOTHING and the set of current rows is a set of ids — not a
 * guess. Unchanged text costs one SELECT and zero embedding calls.
 *
 * WHAT IT REFUSES TO DO
 *
 * - Touch any row outside `sourceId` + `businessId`. Every statement carries
 *   both, so another tenant's knowledge, and this tenant's curated (non-website)
 *   knowledge, are out of reach by construction.
 * - Delete anything for a page it failed to fetch. A 500 or a timeout from the
 *   site keeps that page's last good chunks; only a page that was READ and no
 *   longer contains a chunk loses it.
 * - Delete anything at all when no page was read. "The site was unreachable" is
 *   never evidence that the site is empty.
 *
 * The swap (inserts + deletes) runs in one transaction after all embedding is
 * done, so the live assistant sees the old knowledge or the new, never a
 * half-written mix and never an empty base.
 */

export type SyncResult = {
	pagesRead: number;
	pagesFailed: string[];
	chunksCurrent: number;
	chunksInserted: number;
	chunksUnchanged: number;
	chunksDeleted: number;
};

const EMBED_BATCH = 64;
const FETCH_CONCURRENCY = 4;

async function fetchHtml(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT },
			signal: AbortSignal.timeout(15_000),
			redirect: "follow",
		});
		if (!res.ok) return null;
		const type = res.headers.get("content-type") ?? "";
		if (!type.includes("html")) return null;
		return await res.text();
	} catch {
		return null;
	}
}

type Row = {
	id: string;
	content: string;
	/** What is embedded. Differs from `content` for heading vectors. */
	embedText: string;
	url: string;
	metadata: Record<string, string | null>;
};

export async function syncWebsitePages({
	sql,
	businessId,
	botId,
	sourceId,
	urls,
	prune,
	dryRun = false,
	log = () => {},
}: {
	sql: postgres.Sql;
	businessId: string;
	botId: string | null;
	sourceId: string;
	urls: string[];
	/**
	 * true: `urls` is the COMPLETE page set for this source — rows for any other
	 * page are removed. false: add/refresh these pages only, delete nothing
	 * outside them (used when accepting a single suggested page).
	 */
	prune: boolean;
	dryRun?: boolean;
	log?: (line: string) => void;
}): Promise<SyncResult> {
	const [source] = await sql`
		SELECT id FROM "ContentSource"
		WHERE id = ${sourceId} AND business_id = ${businessId} AND type = 'website'`;
	if (!source) {
		throw new Error(
			`ContentSource ${sourceId} is not a website source of business ${businessId}`,
		);
	}

	// 1. Read every page (a few at a time — this runs inside a 300s function).
	const desired: Row[] = [];
	const read = new Set<string>();
	const failed: string[] = [];
	const queue = [...new Set(urls)];
	await Promise.all(
		Array.from({ length: FETCH_CONCURRENCY }, async () => {
			while (queue.length > 0) {
				const url = queue.shift();
				if (!url) break;
				const html = await fetchHtml(url);
				const page = html ? pageToChunks(html) : null;
				if (!page || page.chunks.length === 0) {
					failed.push(url);
					log(`  ⚠️  ${url} — unreadable, keeping its existing chunks`);
					continue;
				}
				read.add(url);
				for (const c of page.chunks) {
					const metadata = {
						url,
						title: page.title,
						section: c.heading || null,
						language: page.language,
						market: c.market,
					};
					desired.push({
						id: websiteChunkId(sourceId, url, c.content),
						content: c.content,
						embedText: c.content,
						url,
						metadata: { ...metadata, vector: "content" },
					});
					/**
					 * Extra rows for the same text, embedded from its HEADING.
					 *
					 * A visitor's short question and a paragraph that answers it are not
					 * close vectors, even when the paragraph is perfect. Measured on this
					 * tenant on 2026-10-08 with text-embedding-3-small:
					 *
					 *   "How much does it cost?" vs the FAQ answer as prose → not in top 5
					 *   "How much does it cost?" vs its heading, bare      → 1.00
					 *   "What does CushLabs cost?" vs bare heading          → 0.43
					 *   "What does CushLabs cost?" vs "CushLabs.ai — How much does it cost?" → 0.80
					 *
					 * Without the brand-prefixed vector, a brand-named price question
					 * retrieved brand-overview text and NO price, and the live assistant
					 * invented a price list. Both vectors use the LAST heading only: the
					 * full path ("What Premium adds > And everything Basic already
					 * does") made a recap of the lower plan outrank the actual additions.
					 *
					 * Search de-duplicates by content, so these twins never cost the
					 * model a context slot.
					 */
					const vectors: Array<[string, string]> = [["heading", c.leaf]];
					if (page.brand) {
						vectors.push(["brand", `${page.brand} — ${c.leaf}`]);
					}
					for (const [kind, text] of vectors) {
						desired.push({
							// The embedded text is part of the id, so changing how a
							// vector is built produces a new row and prunes the old one.
							id: websiteChunkId(
								sourceId,
								url,
								`${kind}\n${text}\n${c.content}`,
							),
							content: c.content,
							embedText: text,
							url,
							metadata: { ...metadata, vector: kind },
						});
					}
				}
				log(`  ${url} — ${page.chunks.length} chunks`);
			}
		}),
	);

	// The same text can legitimately appear twice on one page (a repeated
	// call-to-action); one row is enough.
	const byId = new Map(desired.map((r) => [r.id, r]));

	// 2. Diff against what the source holds now.
	const existing = await sql<{ id: string; url: string | null }[]>`
		SELECT id, metadata->>'url' AS url FROM "KnowledgeChunk"
		WHERE source_id = ${sourceId} AND business_id = ${businessId}`;
	const existingIds = new Set(existing.map((r) => r.id));
	const toInsert = [...byId.values()].filter((r) => !existingIds.has(r.id));

	const failedSet = new Set(failed);
	const toDelete =
		read.size === 0
			? []
			: existing
					.filter((r) => {
						if (byId.has(r.id)) return false; // still current
						if (r.url && failedSet.has(r.url)) return false; // couldn't check: keep
						if (r.url && read.has(r.url)) return true; // page read, text gone
						return prune; // a page outside this run's set
					})
					.map((r) => r.id);

	const result: SyncResult = {
		pagesRead: read.size,
		pagesFailed: failed,
		chunksCurrent: byId.size,
		chunksInserted: toInsert.length,
		chunksUnchanged: byId.size - toInsert.length,
		chunksDeleted: toDelete.length,
	};
	if (dryRun) return result;
	if (read.size === 0) {
		log("  no page could be read — nothing changed");
		return result;
	}

	// 3. Embed only the new text, before touching any row.
	const embeddings: number[][] = [];
	for (let i = 0; i < toInsert.length; i += EMBED_BATCH) {
		const batch = toInsert.slice(i, i + EMBED_BATCH);
		const { embeddings: e } = await embedMany({
			model: openai.embedding("text-embedding-3-small"),
			values: batch.map((r) => r.embedText),
		});
		embeddings.push(...e);
		log(
			`  embedded ${Math.min(i + EMBED_BATCH, toInsert.length)}/${toInsert.length}`,
		);
	}

	// 4. Swap atomically.
	await sql.begin(async (tx) => {
		for (const [i, r] of toInsert.entries()) {
			await tx`
				INSERT INTO "KnowledgeChunk"
					(id, business_id, bot_id, source_id, content, content_hash, embedding, metadata)
				VALUES (
					${r.id}, ${businessId}, ${botId}, ${sourceId}, ${r.content},
					${hashContent(r.content)}, ${JSON.stringify(embeddings[i])}::vector,
					${tx.json(r.metadata)}
				)
				ON CONFLICT (id) DO NOTHING`;
		}
		if (toDelete.length > 0) {
			await tx`
				DELETE FROM "KnowledgeChunk"
				WHERE source_id = ${sourceId} AND business_id = ${businessId}
					AND id = ANY(${toDelete}::uuid[])`;
		}
	});

	return result;
}
