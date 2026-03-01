import { NextResponse } from "next/server";
import {
	getBusinessesForRetraining,
	updateRetrainingLastRun,
} from "@/lib/db/queries-retraining";
import { retrainWebsiteSources } from "@/lib/ingestion/website";

// Vercel Cron configuration
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
	try {
		// Verify Vercel Cron secret (sent as Authorization: Bearer <CRON_SECRET>)
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET;
		if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get all businesses due for retraining
		const businesses = await getBusinessesForRetraining();

		console.log(`[Cron] Retraining ${businesses.length} businesses`);

		const results = [];

		for (const { businessId } of businesses) {
			try {
				const result = await retrainWebsiteSources({ businessId });
				await updateRetrainingLastRun({ businessId });

				console.log(
					`[Cron] Retrained ${businessId}: ${result.pagesProcessed} pages, ${result.chunksCreated} chunks`,
				);

				results.push({
					businessId,
					success: true,
					pagesProcessed: result.pagesProcessed,
					chunksCreated: result.chunksCreated,
				});
			} catch (error) {
				console.error(`[Cron] Error retraining ${businessId}:`, error);
				results.push({ businessId, success: false, error: String(error) });
			}
		}

		return NextResponse.json({
			processed: businesses.length,
			results,
		});
	} catch (error) {
		console.error("[Cron] Retraining cron failed:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
