import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	createAgent,
	getAgentByUserId,
	updateAgentStatus,
} from "@/lib/db/queries-live-chat";
import { ChatSDKError } from "@/lib/errors";

const updateStatusSchema = z.object({
	status: z.enum(["online", "away", "busy", "offline"]),
});

export async function GET(request: Request) {
	try {
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const agent = await getAgentByUserId({ userId: user.id, businessId });

		if (!agent) {
			return NextResponse.json({ status: null, isAgent: false });
		}

		return NextResponse.json({
			status: agent.status,
			isAgent: true,
			currentChatCount: agent.currentChatCount,
			maxConcurrentChats: agent.maxConcurrentChats,
		});
	} catch (error) {
		console.error("Error in GET /api/admin/agents/me/status:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

export async function PUT(request: Request) {
	try {
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const json = await request.json();
		const data = updateStatusSchema.parse(json);

		// Get or create agent
		let agent = await getAgentByUserId({ userId: user.id, businessId });

		if (!agent) {
			// Auto-create agent for this user
			agent = await createAgent({
				userId: user.id,
				businessId,
			});
		}

		const updated = await updateAgentStatus({
			id: agent.id,
			status: data.status,
		});

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error in PUT /api/admin/agents/me/status:", error);
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
