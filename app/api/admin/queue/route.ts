import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	getLiveChatQueue,
	getQueueStats,
	getWidgetConversation,
	getWidgetMessages,
} from "@/lib/db/queries-live-chat";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
	try {
		const { user, error } = await requirePermission("chat:use");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") as
			| "waiting"
			| "assigned"
			| "resolved"
			| undefined;
		const includeStats = searchParams.get("stats") === "true";
		const includeMessages = searchParams.get("messages") === "true";

		const queue = await getLiveChatQueue({ businessId, status });

		// Optionally include conversation details and messages
		const queueWithDetails = await Promise.all(
			queue.map(async (item) => {
				const conversation = await getWidgetConversation({
					id: item.conversationId,
				});

				if (!includeMessages) {
					return { ...item, conversation };
				}

				const messages = await getWidgetMessages({
					conversationId: item.conversationId,
					limit: 50,
				});

				return { ...item, conversation, messages };
			}),
		);

		if (includeStats) {
			const stats = await getQueueStats({ businessId });
			return NextResponse.json({ queue: queueWithDetails, stats });
		}

		return NextResponse.json(queueWithDetails);
	} catch (error) {
		console.error("Error in GET /api/admin/queue:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
