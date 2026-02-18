import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	deletePlaybook,
	getPlaybookById,
	getPlaybookSteps,
	updatePlaybook,
} from "@/lib/db/queries-playbooks";
import { ChatSDKError } from "@/lib/errors";

const updatePlaybookSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	triggerType: z
		.enum(["keyword", "intent", "url", "manual", "first_message"])
		.optional(),
	triggerConfig: z
		.object({
			keywords: z.array(z.string()).optional(),
			intents: z.array(z.string()).optional(),
			urlPatterns: z.array(z.string()).optional(),
		})
		.optional(),
	priority: z.number().optional(),
	status: z.enum(["draft", "active", "paused"]).optional(),
});

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("bot:view");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;
		const playbook = await getPlaybookById({ id, businessId });

		if (!playbook) {
			return NextResponse.json(
				{ error: "Playbook not found" },
				{ status: 404 },
			);
		}

		// Also fetch steps
		const steps = await getPlaybookSteps({ playbookId: id });

		return NextResponse.json({ ...playbook, steps });
	} catch (error) {
		console.error("Error in GET /api/admin/playbooks/[id]:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;
		const json = await request.json();
		const data = updatePlaybookSchema.parse(json);

		const playbook = await updatePlaybook({
			id,
			businessId,
			...data,
		});

		return NextResponse.json(playbook);
	} catch (error) {
		console.error("Error in PUT /api/admin/playbooks/[id]:", error);
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
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;
		await deletePlaybook({ id, businessId });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error in DELETE /api/admin/playbooks/[id]:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
