import { NextResponse } from "next/server";
import { z } from "zod";
import {
	createContact,
	createContactActivity,
	getContactByEmail,
	updateContact,
} from "@/lib/db/queries-contacts";
import { updateWidgetConversation } from "@/lib/db/queries-live-chat";

const captureSchema = z.object({
	businessId: z.string().uuid(),
	conversationId: z.string().uuid().optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	name: z.string().optional(),
	tags: z.array(z.string()).optional(),
	customFields: z.record(z.string()).optional(),
});

export async function POST(request: Request) {
	try {
		const json = await request.json();
		const data = captureSchema.parse(json);

		if (!data.email && !data.phone && !data.name) {
			return NextResponse.json(
				{ error: "At least one of email, phone, or name is required" },
				{ status: 400 },
			);
		}

		let contactId: string;

		// Check if contact already exists
		if (data.email) {
			const existing = await getContactByEmail({
				businessId: data.businessId,
				email: data.email,
			});

			if (existing) {
				// Update existing contact
				const updated = await updateContact({
					id: existing.id,
					businessId: data.businessId,
					phone: data.phone || existing.phone,
					name: data.name || existing.name,
					tags: data.tags
						? [...new Set([...(existing.tags as string[]), ...data.tags])]
						: undefined,
					customFields: data.customFields
						? {
								...(existing.customFields as Record<string, string>),
								...data.customFields,
							}
						: undefined,
				});
				contactId = updated.id;

				// Log activity
				await createContactActivity({
					contactId,
					type: "email_captured",
					description: "Contact info updated via widget",
				});
			} else {
				// Create new contact
				const newContact = await createContact({
					businessId: data.businessId,
					email: data.email,
					phone: data.phone,
					name: data.name,
					status: "engaged",
					tags: data.tags,
					customFields: data.customFields,
				});
				contactId = newContact.id;

				// Log activity
				await createContactActivity({
					contactId,
					type: "email_captured",
					description: "Contact captured via widget",
				});
			}
		} else {
			// Create new contact without email
			const newContact = await createContact({
				businessId: data.businessId,
				phone: data.phone,
				name: data.name,
				status: "new",
				tags: data.tags,
				customFields: data.customFields,
			});
			contactId = newContact.id;

			// Log activity
			await createContactActivity({
				contactId,
				type: data.phone ? "phone_captured" : "chat_started",
				description: "Contact captured via widget",
			});
		}

		// Link contact to conversation if provided
		if (data.conversationId) {
			await updateWidgetConversation({
				id: data.conversationId,
				contactId,
			});
		}

		return NextResponse.json({ contactId, success: true });
	} catch (error) {
		console.error("Error in POST /api/embed/capture:", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request body", details: error.errors },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
