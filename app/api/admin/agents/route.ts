import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	createAgent,
	getAgentByUserId,
	getAgentsByBusinessId,
	updateAgent,
} from "@/lib/db/queries-live-chat";
import { ChatSDKError } from "@/lib/errors";

const createAgentSchema = z.object({
	userId: z.string().uuid(),
	maxConcurrentChats: z.number().min(1).max(20).optional(),
	departments: z.array(z.string()).optional(),
});

const updateAgentSchema = z.object({
	id: z.string().uuid(),
	maxConcurrentChats: z.number().min(1).max(20).optional(),
	departments: z.array(z.string()).optional(),
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

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") as
			| "online"
			| "away"
			| "busy"
			| "offline"
			| undefined;

		const agents = await getAgentsByBusinessId({ businessId, status });

		return NextResponse.json(agents);
	} catch (error) {
		console.error("Error in GET /api/admin/agents:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

export async function POST(request: Request) {
	try {
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const json = await request.json();
		const data = createAgentSchema.parse(json);

		// Check if agent already exists
		const existing = await getAgentByUserId({
			userId: data.userId,
			businessId,
		});
		if (existing) {
			return NextResponse.json(
				{ error: "Agent already exists for this user" },
				{ status: 400 },
			);
		}

		const agent = await createAgent({
			businessId,
			...data,
		});

		return NextResponse.json(agent, { status: 201 });
	} catch (error) {
		console.error("Error in POST /api/admin/agents:", error);
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

export async function PUT(request: Request) {
	try {
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		await ensureDefaultTenantForUser({ userId: user.id });

		const json = await request.json();
		const data = updateAgentSchema.parse(json);

		const agent = await updateAgent(data);

		return NextResponse.json(agent);
	} catch (error) {
		console.error("Error in PUT /api/admin/agents:", error);
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
