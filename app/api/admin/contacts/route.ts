import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	createContact,
	getContactsByBusinessId,
} from "@/lib/db/queries-contacts";
import { ChatSDKError } from "@/lib/errors";

const createContactSchema = z.object({
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	name: z.string().optional().nullable(),
	status: z.enum(["new", "engaged", "qualified", "converted"]).optional(),
	leadScore: z.number().optional(),
	tags: z.array(z.string()).optional(),
	customFields: z.record(z.string()).optional(),
});

export async function GET(request: Request) {
	try {
		const { user, error } = await requirePermission("analytics:view");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { searchParams } = new URL(request.url);
		const limit = Math.min(
			Math.max(Number.parseInt(searchParams.get("limit") || "50", 10), 1),
			1000,
		);
		const offset = Math.max(
			Number.parseInt(searchParams.get("offset") || "0", 10),
			0,
		);
		const search = searchParams.get("search") || undefined;
		const status = searchParams.get("status") as
			| "new"
			| "engaged"
			| "qualified"
			| "converted"
			| undefined;
		const tagsParam = searchParams.get("tags");
		const tags = tagsParam ? tagsParam.split(",") : undefined;

		const result = await getContactsByBusinessId({
			businessId,
			limit,
			offset,
			search,
			status,
			tags,
		});

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in GET /api/admin/contacts:", error);
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

		const json = await request.json();
		const data = createContactSchema.parse(json);

		const contact = await createContact({
			businessId,
			...data,
		});

		return NextResponse.json(contact, { status: 201 });
	} catch (error) {
		console.error("Error in POST /api/admin/contacts:", error);
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
