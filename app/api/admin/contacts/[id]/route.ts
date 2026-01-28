import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	deleteContact,
	getContactById,
	updateContact,
} from "@/lib/db/queries-contacts";
import { ChatSDKError } from "@/lib/errors";

const updateContactSchema = z.object({
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	name: z.string().optional().nullable(),
	status: z.enum(["new", "engaged", "qualified", "converted"]).optional(),
	leadScore: z.number().optional(),
	tags: z.array(z.string()).optional(),
	customFields: z.record(z.string()).optional(),
});

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;
		const contact = await getContactById({ id, businessId });

		if (!contact) {
			return NextResponse.json({ error: "Contact not found" }, { status: 404 });
		}

		return NextResponse.json(contact);
	} catch (error) {
		console.error("Error in GET /api/admin/contacts/[id]:", error);
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
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;
		const json = await request.json();
		const data = updateContactSchema.parse(json);

		const contact = await updateContact({
			id,
			businessId,
			...data,
		});

		return NextResponse.json(contact);
	} catch (error) {
		console.error("Error in PUT /api/admin/contacts/[id]:", error);
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
		const user = await getAuthUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;
		await deleteContact({ id, businessId });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error in DELETE /api/admin/contacts/[id]:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
