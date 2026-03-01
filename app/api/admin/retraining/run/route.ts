import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import { updateRetrainingLastRun } from "@/lib/db/queries-retraining";
import { ChatSDKError } from "@/lib/errors";
import { retrainWebsiteSources } from "@/lib/ingestion/website";

export const maxDuration = 300; // 5 minutes for retraining

export async function POST(request: Request) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		console.log(`[retrain] Starting retraining for business: ${businessId}`);

		const result = await retrainWebsiteSources({ businessId });
		await updateRetrainingLastRun({ businessId });

		console.log(
			`[retrain] Done. Pages: ${result.pagesProcessed}, Chunks: ${result.chunksCreated}`,
		);

		return NextResponse.json({
			success: true,
			message: "Retraining complete",
			pagesProcessed: result.pagesProcessed,
			chunksCreated: result.chunksCreated,
		});
	} catch (error) {
		console.error("Error in POST /api/admin/retraining/run:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
