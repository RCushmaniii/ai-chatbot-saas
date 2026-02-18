import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	createWidgetMessage,
	getWidgetConversation,
	getWidgetMessages,
} from "@/lib/db/queries-live-chat";
import { ChatSDKError } from "@/lib/errors";

const createMessageSchema = z.object({
	content: z.string().min(1),
	role: z.enum(["agent", "system"]).default("agent"),
});

export async function GET(
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

		// Verify conversation belongs to business
		const conversation = await getWidgetConversation({ id });
		if (!conversation || conversation.businessId !== businessId) {
			return NextResponse.json(
				{ error: "Conversation not found" },
				{ status: 404 },
			);
		}

		const { searchParams } = new URL(request.url);
		const limit = Number.parseInt(searchParams.get("limit") || "100", 10);

		const messages = await getWidgetMessages({ conversationId: id, limit });

		return NextResponse.json(messages);
	} catch (error) {
		console.error(
			"Error in GET /api/admin/conversations/[id]/messages:",
			error,
		);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

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

		// Verify conversation belongs to business
		const conversation = await getWidgetConversation({ id });
		if (!conversation || conversation.businessId !== businessId) {
			return NextResponse.json(
				{ error: "Conversation not found" },
				{ status: 404 },
			);
		}

		const json = await request.json();
		const data = createMessageSchema.parse(json);

		const message = await createWidgetMessage({
			conversationId: id,
			role: data.role,
			content: data.content,
			metadata: { agentUserId: user.id },
		});

		return NextResponse.json(message, { status: 201 });
	} catch (error) {
		console.error(
			"Error in POST /api/admin/conversations/[id]/messages:",
			error,
		);
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
