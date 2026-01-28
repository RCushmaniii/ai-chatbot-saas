import { NextResponse } from "next/server";
import { z } from "zod";
import { entitlementsByPlan } from "@/lib/ai/entitlements";
import { getAuthUser } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	getRetrainingConfig,
	upsertRetrainingConfig,
} from "@/lib/db/queries-retraining";
import { ChatSDKError } from "@/lib/errors";

const updateConfigSchema = z.object({
	enabled: z.boolean().optional(),
	schedule: z.enum(["daily", "weekly", "monthly"]).optional(),
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

		const config = await getRetrainingConfig({ businessId });

		// Check if scheduled retraining is available for this plan
		const planLimits = entitlementsByPlan.free; // TODO: Get actual plan
		const isAvailable = planLimits.scheduledRetraining;

		return NextResponse.json({
			config: config || {
				enabled: false,
				schedule: "weekly",
				lastRunAt: null,
				nextRunAt: null,
			},
			isAvailable,
		});
	} catch (error) {
		console.error("Error in GET /api/admin/retraining/config:", error);
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

		// Check if scheduled retraining is available for this plan
		const planLimits = entitlementsByPlan.free; // TODO: Get actual plan
		if (!planLimits.scheduledRetraining) {
			return NextResponse.json(
				{
					error:
						"Scheduled retraining is not available on your plan. Please upgrade.",
				},
				{ status: 403 },
			);
		}

		const json = await request.json();
		const data = updateConfigSchema.parse(json);

		const config = await upsertRetrainingConfig({
			businessId,
			...data,
		});

		return NextResponse.json(config);
	} catch (error) {
		console.error("Error in PUT /api/admin/retraining/config:", error);
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
