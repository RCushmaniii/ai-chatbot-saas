import { NextResponse } from "next/server";
import { z } from "zod";
import { entitlementsByPlan } from "@/lib/ai/entitlements";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	countPlaybooksByBusinessId,
	createPlaybook,
	getPlaybooksByBusinessId,
} from "@/lib/db/queries-playbooks";
import { ChatSDKError } from "@/lib/errors";

const createPlaybookSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	triggerType: z.enum(["keyword", "intent", "url", "manual", "first_message"]),
	triggerConfig: z
		.object({
			keywords: z.array(z.string()).optional(),
			intents: z.array(z.string()).optional(),
			urlPatterns: z.array(z.string()).optional(),
		})
		.optional(),
	botId: z.string().uuid().optional(),
	priority: z.number().optional(),
});

export async function GET(request: Request) {
	try {
		const { user, error } = await requirePermission("bot:view");
		if (error) return error;

		const { businessId, botId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") as
			| "draft"
			| "active"
			| "paused"
			| undefined;

		const playbooks = await getPlaybooksByBusinessId({
			businessId,
			botId,
			status,
		});

		return NextResponse.json(playbooks);
	} catch (error) {
		console.error("Error in GET /api/admin/playbooks:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

export async function POST(request: Request) {
	try {
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId, botId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		// Check playbook limit (using 'free' plan as default)
		const currentCount = await countPlaybooksByBusinessId({ businessId });
		const planLimits = entitlementsByPlan.free; // TODO: Get actual plan

		if (
			planLimits.playbooksLimit !== -1 &&
			currentCount >= planLimits.playbooksLimit
		) {
			return NextResponse.json(
				{ error: "Playbook limit reached. Please upgrade your plan." },
				{ status: 403 },
			);
		}

		const json = await request.json();
		const data = createPlaybookSchema.parse(json);

		const playbook = await createPlaybook({
			businessId,
			botId: data.botId || botId,
			...data,
		});

		return NextResponse.json(playbook, { status: 201 });
	} catch (error) {
		console.error("Error in POST /api/admin/playbooks:", error);
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
