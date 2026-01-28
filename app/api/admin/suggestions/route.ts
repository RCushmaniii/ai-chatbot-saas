import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	getPendingSuggestionsCount,
	getTrainingSuggestions,
} from "@/lib/db/queries-retraining";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
	try {
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") as
			| "pending"
			| "accepted"
			| "dismissed"
			| undefined;
		const limit = Number.parseInt(searchParams.get("limit") || "50", 10);

		const suggestions = await getTrainingSuggestions({
			businessId,
			status,
			limit,
		});

		const pendingCount = await getPendingSuggestionsCount({ businessId });

		return NextResponse.json({ suggestions, pendingCount });
	} catch (error) {
		console.error("Error in GET /api/admin/suggestions:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
