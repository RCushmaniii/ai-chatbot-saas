import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	assignQueueItem,
	getAgentById,
	getAgentByUserId,
	getQueueItemById,
	resolveQueueItem,
} from "@/lib/db/queries-live-chat";
import { ChatSDKError } from "@/lib/errors";

const assignSchema = z.object({
	agentId: z.string().uuid().optional(),
});

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("chat:use");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;

		// Verify queue item exists
		const queueItem = await getQueueItemById({ id });
		if (!queueItem || queueItem.businessId !== businessId) {
			return NextResponse.json(
				{ error: "Queue item not found" },
				{ status: 404 },
			);
		}

		const json = await request.json();
		const data = assignSchema.parse(json);

		// If no agentId provided, assign to current user
		let agentId = data.agentId;
		if (!agentId) {
			const agent = await getAgentByUserId({ userId: user.id, businessId });
			if (!agent) {
				return NextResponse.json(
					{ error: "You are not registered as an agent" },
					{ status: 400 },
				);
			}
			agentId = agent.id;
		}

		// Verify agent exists and has capacity
		const agent = await getAgentById({ id: agentId });
		if (!agent) {
			return NextResponse.json({ error: "Agent not found" }, { status: 404 });
		}

		if (agent.status !== "online") {
			return NextResponse.json(
				{ error: "Agent is not online" },
				{ status: 400 },
			);
		}

		if (agent.currentChatCount >= agent.maxConcurrentChats) {
			return NextResponse.json(
				{ error: "Agent has reached maximum concurrent chats" },
				{ status: 400 },
			);
		}

		const updated = await assignQueueItem({ id, agentId });

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error in POST /api/admin/queue/[id]/assign:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request body", details: error.errors },
				{ status: 400 },
			);
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("chat:use");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;

		// Verify queue item exists
		const queueItem = await getQueueItemById({ id });
		if (!queueItem || queueItem.businessId !== businessId) {
			return NextResponse.json(
				{ error: "Queue item not found" },
				{ status: 404 },
			);
		}

		const updated = await resolveQueueItem({ id });

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error in DELETE /api/admin/queue/[id]/assign:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
