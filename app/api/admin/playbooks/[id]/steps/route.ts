import { NextResponse } from "next/server";
import { z } from "zod";
import { entitlementsByPlan } from "@/lib/ai/entitlements";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	countPlaybookSteps,
	createPlaybookStep,
	deletePlaybookStep,
	getPlaybookById,
	getPlaybookSteps,
	updatePlaybookStep,
	updatePlaybookStepsBulk,
} from "@/lib/db/queries-playbooks";
import { ChatSDKError } from "@/lib/errors";

const stepConfigSchema = z.object({
	message: z.string().optional(),
	question: z.string().optional(),
	variableName: z.string().optional(),
	validation: z.enum(["email", "phone", "text", "number"]).optional(),
	options: z
		.array(
			z.object({
				label: z.string(),
				value: z.string(),
				nextStepId: z.string().optional(),
			}),
		)
		.optional(),
	conditions: z
		.array(
			z.object({
				variable: z.string(),
				operator: z.enum(["equals", "contains", "startsWith", "regex"]),
				value: z.string(),
				nextStepId: z.string(),
			}),
		)
		.optional(),
	defaultNextStepId: z.string().optional(),
	actionType: z
		.enum(["capture_contact", "add_tag", "set_score", "webhook"])
		.optional(),
	actionConfig: z.record(z.unknown()).optional(),
	department: z.string().optional(),
	priority: z.number().optional(),
	aiSummaryEnabled: z.boolean().optional(),
});

const createStepSchema = z.object({
	type: z.enum([
		"message",
		"question",
		"options",
		"condition",
		"action",
		"handoff",
		"stop",
	]),
	name: z.string().optional(),
	config: stepConfigSchema.optional(),
	position: z.number().optional(),
	nextStepId: z.string().optional(),
	positionX: z.number().optional(),
	positionY: z.number().optional(),
});

const updateStepSchema = z.object({
	id: z.string(),
	type: z
		.enum([
			"message",
			"question",
			"options",
			"condition",
			"action",
			"handoff",
			"stop",
		])
		.optional(),
	name: z.string().optional(),
	config: stepConfigSchema.optional(),
	position: z.number().optional(),
	nextStepId: z.string().nullable().optional(),
	positionX: z.number().optional(),
	positionY: z.number().optional(),
});

const bulkUpdateSchema = z.object({
	steps: z.array(
		z.object({
			id: z.string(),
			position: z.number().optional(),
			positionX: z.number().optional(),
			positionY: z.number().optional(),
			nextStepId: z.string().nullable().optional(),
		}),
	),
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

		// Verify playbook belongs to business
		const playbook = await getPlaybookById({ id, businessId });
		if (!playbook) {
			return NextResponse.json(
				{ error: "Playbook not found" },
				{ status: 404 },
			);
		}

		const steps = await getPlaybookSteps({ playbookId: id });

		return NextResponse.json(steps);
	} catch (error) {
		console.error("Error in GET /api/admin/playbooks/[id]/steps:", error);
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
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id: playbookId } = await params;

		// Verify playbook belongs to business
		const playbook = await getPlaybookById({ id: playbookId, businessId });
		if (!playbook) {
			return NextResponse.json(
				{ error: "Playbook not found" },
				{ status: 404 },
			);
		}

		// Check step limit
		const currentCount = await countPlaybookSteps({ playbookId });
		const planLimits = entitlementsByPlan.free; // TODO: Get actual plan

		if (
			planLimits.playbookStepsLimit !== -1 &&
			currentCount >= planLimits.playbookStepsLimit
		) {
			return NextResponse.json(
				{ error: "Step limit reached. Please upgrade your plan." },
				{ status: 403 },
			);
		}

		const json = await request.json();
		const data = createStepSchema.parse(json);

		const step = await createPlaybookStep({
			playbookId,
			...data,
		});

		return NextResponse.json(step, { status: 201 });
	} catch (error) {
		console.error("Error in POST /api/admin/playbooks/[id]/steps:", error);
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

		const { id: playbookId } = await params;

		// Verify playbook belongs to business
		const playbook = await getPlaybookById({ id: playbookId, businessId });
		if (!playbook) {
			return NextResponse.json(
				{ error: "Playbook not found" },
				{ status: 404 },
			);
		}

		const json = await request.json();

		// Check if it's a bulk update
		if (json.steps) {
			const data = bulkUpdateSchema.parse(json);
			await updatePlaybookStepsBulk(data);
			return NextResponse.json({ success: true });
		}

		// Single step update
		const data = updateStepSchema.parse(json);
		const step = await updatePlaybookStep(data);

		return NextResponse.json(step);
	} catch (error) {
		console.error("Error in PUT /api/admin/playbooks/[id]/steps:", error);
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

		const { id: playbookId } = await params;

		// Verify playbook belongs to business
		const playbook = await getPlaybookById({ id: playbookId, businessId });
		if (!playbook) {
			return NextResponse.json(
				{ error: "Playbook not found" },
				{ status: 404 },
			);
		}

		const { searchParams } = new URL(request.url);
		const stepId = searchParams.get("stepId");

		if (!stepId) {
			return NextResponse.json({ error: "Step ID required" }, { status: 400 });
		}

		await deletePlaybookStep({ id: stepId });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error in DELETE /api/admin/playbooks/[id]/steps:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
