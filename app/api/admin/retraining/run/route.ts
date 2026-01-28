import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import { updateRetrainingLastRun } from "@/lib/db/queries-retraining";
import { ChatSDKError } from "@/lib/errors";

export async function POST(request: Request) {
	try {
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		// TODO: Trigger actual retraining process
		// This would involve:
		// 1. Re-scraping all website sources
		// 2. Re-processing all documents
		// 3. Re-generating embeddings
		// For now, we just update the last run time

		await updateRetrainingLastRun({ businessId });

		return NextResponse.json({
			success: true,
			message: "Retraining initiated",
		});
	} catch (error) {
		console.error("Error in POST /api/admin/retraining/run:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
