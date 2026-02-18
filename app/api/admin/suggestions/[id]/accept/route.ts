import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import { updateTrainingSuggestionStatus } from "@/lib/db/queries-retraining";
import { ChatSDKError } from "@/lib/errors";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		await ensureDefaultTenantForUser({ userId: user.id });

		const { id } = await params;

		// TODO: Actually train the page
		// This would involve:
		// 1. Scraping the URL
		// 2. Processing the content
		// 3. Generating embeddings
		// 4. Storing in the knowledge base

		const updated = await updateTrainingSuggestionStatus({
			id,
			status: "accepted",
		});

		return NextResponse.json(updated);
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
