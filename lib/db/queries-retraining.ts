import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError } from "../errors";
import {
	type RetrainingConfig,
	retrainingConfig,
	type SitemapScan,
	sitemapScan,
	type TrainingSuggestion,
	trainingSuggestion,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ===========================================
// RETRAINING CONFIG QUERIES
// ===========================================

export async function getRetrainingConfig({
	businessId,
}: {
	businessId: string;
}): Promise<RetrainingConfig | null> {
	try {
		const [result] = await db
			.select()
			.from(retrainingConfig)
			.where(eq(retrainingConfig.businessId, businessId))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching retraining config:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get retraining config",
		);
	}
}

export async function upsertRetrainingConfig({
	businessId,
	enabled,
	schedule,
}: {
	businessId: string;
	enabled?: boolean;
	schedule?: RetrainingConfig["schedule"];
}): Promise<RetrainingConfig> {
	try {
		const existing = await getRetrainingConfig({ businessId });

		if (existing) {
			const updateData: Partial<RetrainingConfig> = { updatedAt: new Date() };
			if (enabled !== undefined) updateData.enabled = enabled;
			if (schedule !== undefined) updateData.schedule = schedule;

			// Calculate next run time
			if (enabled && schedule) {
				updateData.nextRunAt = calculateNextRunTime(schedule);
			}

			const [updated] = await db
				.update(retrainingConfig)
				.set(updateData)
				.where(eq(retrainingConfig.businessId, businessId))
				.returning();

			return updated;
		}

		const [created] = await db
			.insert(retrainingConfig)
			.values({
				businessId,
				enabled: enabled ?? false,
				schedule: schedule ?? "weekly",
				nextRunAt: enabled && schedule ? calculateNextRunTime(schedule) : null,
			})
			.returning();

		return created;
	} catch (error) {
		console.error("Error upserting retraining config:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update retraining config",
		);
	}
}

export async function updateRetrainingLastRun({
	businessId,
}: {
	businessId: string;
}): Promise<void> {
	try {
		const config = await getRetrainingConfig({ businessId });
		if (!config) return;

		await db
			.update(retrainingConfig)
			.set({
				lastRunAt: new Date(),
				nextRunAt: calculateNextRunTime(config.schedule),
				updatedAt: new Date(),
			})
			.where(eq(retrainingConfig.businessId, businessId));
	} catch (error) {
		console.error("Error updating last run:", error);
		throw new ChatSDKError("bad_request:database", "Failed to update last run");
	}
}

function calculateNextRunTime(schedule: RetrainingConfig["schedule"]): Date {
	const now = new Date();
	switch (schedule) {
		case "daily":
			return new Date(now.getTime() + 24 * 60 * 60 * 1000);
		case "weekly":
			return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
		case "monthly":
			return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
		default:
			return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	}
}

export async function getBusinessesForRetraining(): Promise<
	Array<{ businessId: string }>
> {
	try {
		return await db
			.select({ businessId: retrainingConfig.businessId })
			.from(retrainingConfig)
			.where(
				and(
					eq(retrainingConfig.enabled, true),
					sql`${retrainingConfig.nextRunAt} <= NOW()`,
				),
			);
	} catch (error) {
		console.error("Error fetching businesses for retraining:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get businesses for retraining",
		);
	}
}

// ===========================================
// SITEMAP SCAN QUERIES
// ===========================================

export async function createSitemapScan({
	businessId,
	sitemapUrl,
	pagesFound,
	newPages,
	removedPages,
	scanResults,
}: {
	businessId: string;
	sitemapUrl: string;
	pagesFound: number;
	newPages: number;
	removedPages: number;
	scanResults?: SitemapScan["scanResults"];
}): Promise<SitemapScan> {
	try {
		const [scan] = await db
			.insert(sitemapScan)
			.values({
				businessId,
				sitemapUrl,
				pagesFound,
				newPages,
				removedPages,
				scanResults,
			})
			.returning();

		return scan;
	} catch (error) {
		console.error("Error creating sitemap scan:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create sitemap scan",
		);
	}
}

export async function getLatestSitemapScan({
	businessId,
}: {
	businessId: string;
}): Promise<SitemapScan | null> {
	try {
		const [result] = await db
			.select()
			.from(sitemapScan)
			.where(eq(sitemapScan.businessId, businessId))
			.orderBy(desc(sitemapScan.scannedAt))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching sitemap scan:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get sitemap scan",
		);
	}
}

export async function getSitemapScans({
	businessId,
	limit = 10,
}: {
	businessId: string;
	limit?: number;
}): Promise<SitemapScan[]> {
	try {
		return await db
			.select()
			.from(sitemapScan)
			.where(eq(sitemapScan.businessId, businessId))
			.orderBy(desc(sitemapScan.scannedAt))
			.limit(limit);
	} catch (error) {
		console.error("Error fetching sitemap scans:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get sitemap scans",
		);
	}
}

// ===========================================
// TRAINING SUGGESTION QUERIES
// ===========================================

export async function getTrainingSuggestions({
	businessId,
	status,
	limit = 50,
}: {
	businessId: string;
	status?: TrainingSuggestion["status"];
	limit?: number;
}): Promise<TrainingSuggestion[]> {
	try {
		const conditions = [eq(trainingSuggestion.businessId, businessId)];

		if (status) {
			conditions.push(eq(trainingSuggestion.status, status));
		}

		return await db
			.select()
			.from(trainingSuggestion)
			.where(and(...conditions))
			.orderBy(desc(trainingSuggestion.createdAt))
			.limit(limit);
	} catch (error) {
		console.error("Error fetching training suggestions:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get training suggestions",
		);
	}
}

export async function createTrainingSuggestion({
	businessId,
	scanId,
	type,
	url,
	title,
}: {
	businessId: string;
	scanId?: string;
	type: TrainingSuggestion["type"];
	url: string;
	title?: string;
}): Promise<TrainingSuggestion> {
	try {
		const [suggestion] = await db
			.insert(trainingSuggestion)
			.values({
				businessId,
				scanId,
				type,
				url,
				title,
				status: "pending",
			})
			.returning();

		return suggestion;
	} catch (error) {
		console.error("Error creating training suggestion:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create training suggestion",
		);
	}
}

export async function updateTrainingSuggestionStatus({
	id,
	status,
}: {
	id: string;
	status: TrainingSuggestion["status"];
}): Promise<TrainingSuggestion> {
	try {
		const [updated] = await db
			.update(trainingSuggestion)
			.set({
				status,
				processedAt: status !== "pending" ? new Date() : null,
			})
			.where(eq(trainingSuggestion.id, id))
			.returning();

		return updated;
	} catch (error) {
		console.error("Error updating training suggestion:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update training suggestion",
		);
	}
}

export async function getPendingSuggestionsCount({
	businessId,
}: {
	businessId: string;
}): Promise<number> {
	try {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(trainingSuggestion)
			.where(
				and(
					eq(trainingSuggestion.businessId, businessId),
					eq(trainingSuggestion.status, "pending"),
				),
			);

		return result?.count ?? 0;
	} catch (error) {
		console.error("Error counting suggestions:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to count suggestions",
		);
	}
}

export async function createTrainingSuggestionsBulk({
	suggestions,
}: {
	suggestions: Array<{
		businessId: string;
		scanId?: string;
		type: TrainingSuggestion["type"];
		url: string;
		title?: string;
	}>;
}): Promise<void> {
	try {
		if (suggestions.length === 0) return;

		await db.insert(trainingSuggestion).values(
			suggestions.map((s) => ({
				businessId: s.businessId,
				scanId: s.scanId,
				type: s.type,
				url: s.url,
				title: s.title,
				status: "pending" as const,
			})),
		);
	} catch (error) {
		console.error("Error creating training suggestions:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create training suggestions",
		);
	}
}
