import { NextResponse } from "next/server";
import postgres from "postgres";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import { updateTrainingSuggestionStatus } from "@/lib/db/queries-retraining";
import { ChatSDKError } from "@/lib/errors";
import { scrapeAndEmbedPage } from "@/lib/ingestion/website";

const sql = postgres(process.env.POSTGRES_URL!);

export const maxDuration = 60; // 1 minute for single page

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;

		// Get the suggestion to find the URL
		const [suggestion] = await sql`
			SELECT id, url, business_id FROM "TrainingSuggestion"
			WHERE id = ${id} AND business_id = ${businessId}
		`;

		if (!suggestion) {
			return NextResponse.json(
				{ error: "Suggestion not found" },
				{ status: 404 },
			);
		}

		// Find or create a ContentSource for this page
		let sourceId: string;
		const pageUrl = suggestion.url as string;
		const origin = new URL(pageUrl).origin;

		const [existingSource] = await sql`
			SELECT id FROM "ContentSource"
			WHERE business_id = ${businessId}
			  AND type = 'website'
			  AND name = ${origin}
			LIMIT 1
		`;

		if (existingSource) {
			sourceId = existingSource.id as string;
		} else {
			const [newSource] = await sql`
				INSERT INTO "ContentSource" (business_id, type, name, url, status)
				VALUES (${businessId}, 'website', ${origin}, ${origin}, 'processed')
				RETURNING id
			`;
			sourceId = newSource.id as string;
		}

		// Scrape and embed the suggested page
		const chunksCreated = await scrapeAndEmbedPage({
			url: pageUrl,
			businessId,
			botId: user.botId ?? null,
			sourceId,
		});

		// Mark the suggestion as accepted
		const updated = await updateTrainingSuggestionStatus({
			id,
			status: "accepted",
		});

		console.log(
			`[suggestion] Accepted suggestion ${id}: scraped ${pageUrl}, created ${chunksCreated} chunks`,
		);

		return NextResponse.json({
			...updated,
			chunksCreated,
		});
	} catch (error) {
		console.error("Error in POST /api/admin/suggestions/[id]/accept:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		await ensureDefaultTenantForUser({ userId: user.id });

		const { id } = await params;

		const updated = await updateTrainingSuggestionStatus({
			id,
			status: "dismissed",
		});

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error in DELETE /api/admin/suggestions/[id]/accept:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
