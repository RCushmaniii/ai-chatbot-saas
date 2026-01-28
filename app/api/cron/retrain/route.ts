import { NextResponse } from "next/server";
import {
	getBusinessesForRetraining,
	updateRetrainingLastRun,
} from "@/lib/db/queries-retraining";

// Vercel Cron configuration
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
	try {
		// Verify cron secret
		const authHeader = request.headers.get("authorization");
		if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get all businesses due for retraining
		const businesses = await getBusinessesForRetraining();

		console.log(`[Cron] Retraining ${businesses.length} businesses`);

		const results = [];

		for (const { businessId } of businesses) {
			try {
				// TODO: Actually run retraining for each business
				// This would involve:
				// 1. Re-scraping website sources
				// 2. Re-processing uploaded documents
				// 3. Re-generating embeddings
				// For now, we just update the last run time

				await updateRetrainingLastRun({ businessId });

				results.push({ businessId, success: true });
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
