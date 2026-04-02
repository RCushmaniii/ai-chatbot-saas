import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import { getBusinessPlanEntitlements } from "@/lib/db/queries-billing";
import { whatsappPhoneMapping } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const createPhoneMappingSchema = z.object({
	phoneNumberId: z
		.string()
		.min(1, "Phone number ID is required")
		.max(50),
	displayPhoneNumber: z
		.string()
		.min(1, "Display phone number is required")
		.max(20),
	displayName: z.string().max(255).optional().nullable(),
	accessToken: z.string().min(1, "Access token is required"),
});

export async function GET() {
	try {
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { entitlements } = await getBusinessPlanEntitlements({ businessId });

		const mappings = await db
			.select()
			.from(whatsappPhoneMapping)
			.where(eq(whatsappPhoneMapping.businessId, businessId));

		return NextResponse.json({
			mappings,
			whatsappEnabled: entitlements.whatsappEnabled,
		});
	} catch (error) {
		console.error("Error in GET /api/admin/whatsapp:", error);
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

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { entitlements } = await getBusinessPlanEntitlements({ businessId });
		if (!entitlements.whatsappEnabled) {
			return NextResponse.json(
				{ error: "WhatsApp is not available on your current plan. Upgrade to Pro or Business." },
				{ status: 403 },
			);
		}

		const json = await request.json();
		const data = createPhoneMappingSchema.parse(json);

		// Check if this phoneNumberId is already registered
		const [existing] = await db
			.select()
			.from(whatsappPhoneMapping)
			.where(eq(whatsappPhoneMapping.phoneNumberId, data.phoneNumberId))
			.limit(1);

		if (existing) {
			return NextResponse.json(
				{ error: "This WhatsApp phone number ID is already registered." },
				{ status: 409 },
			);
		}

		const [mapping] = await db
			.insert(whatsappPhoneMapping)
			.values({
				businessId,
				phoneNumberId: data.phoneNumberId,
				displayPhoneNumber: data.displayPhoneNumber,
				displayName: data.displayName || null,
				accessToken: data.accessToken,
				isActive: true,
			})
			.returning();

		return NextResponse.json(mapping, { status: 201 });
	} catch (error) {
		console.error("Error in POST /api/admin/whatsapp:", error);
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

export async function DELETE(request: Request) {
	try {
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Phone mapping ID is required" },
				{ status: 400 },
			);
		}

		// Verify ownership before deleting
		const [mapping] = await db
			.select()
			.from(whatsappPhoneMapping)
			.where(
				and(
					eq(whatsappPhoneMapping.id, id),
					eq(whatsappPhoneMapping.businessId, businessId),
				),
			)
			.limit(1);

		if (!mapping) {
			return NextResponse.json(
				{ error: "Phone mapping not found" },
				{ status: 404 },
			);
		}

		await db
			.update(whatsappPhoneMapping)
			.set({ isActive: false, updatedAt: new Date() })
			.where(eq(whatsappPhoneMapping.id, id));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error in DELETE /api/admin/whatsapp:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
