import { NextResponse } from "next/server";
import Papa from "papaparse";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import { importContacts } from "@/lib/db/queries-contacts";
import { ChatSDKError } from "@/lib/errors";

export async function POST(request: Request) {
	try {
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		const text = await file.text();
		const parsed = Papa.parse<{
			email?: string;
			phone?: string;
			name?: string;
			tags?: string;
			customFields?: string;
		}>(text, {
			header: true,
			skipEmptyLines: true,
		});

		if (parsed.errors.length > 0) {
			return NextResponse.json(
				{ error: "Invalid CSV format", details: parsed.errors },
				{ status: 400 },
			);
		}

		const contacts = parsed.data.map((row, index) => {
			let customFields: Record<string, string> | undefined;
			if (row.customFields) {
				try {
					customFields = JSON.parse(row.customFields) as Record<string, string>;
				} catch {
					throw new Error(`Invalid JSON in customFields at row ${index + 1}`);
				}
			}
			return {
				email: row.email || null,
				phone: row.phone || null,
				name: row.name || null,
				tags: row.tags ? row.tags.split(";").filter(Boolean) : [],
				customFields,
			};
		});

		const result = await importContacts({ businessId, contacts });

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in POST /api/admin/contacts/import:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
