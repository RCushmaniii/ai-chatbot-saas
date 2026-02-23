import { NextResponse } from "next/server";
import Papa from "papaparse";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import { exportContacts } from "@/lib/db/queries-contacts";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
	try {
		const { user, error } = await requirePermission("analytics:view");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { searchParams } = new URL(request.url);
		const idsParam = searchParams.get("ids");
		const ids = idsParam ? idsParam.split(",") : undefined;

		const contacts = await exportContacts({ businessId, ids });

		// Sanitize CSV values to prevent formula injection in spreadsheets
		const sanitizeCsvValue = (value: string): string => {
			if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) {
				return `'${value}`;
			}
			return value;
		};

		// Convert to CSV
		const csvData = contacts.map((c) => ({
			id: c.id,
			email: sanitizeCsvValue(c.email || ""),
			phone: sanitizeCsvValue(c.phone || ""),
			name: sanitizeCsvValue(c.name || ""),
			status: c.status,
			leadScore: c.leadScore || 0,
			tags: sanitizeCsvValue((c.tags as string[])?.join(";") || ""),
			customFields: c.customFields
				? sanitizeCsvValue(JSON.stringify(c.customFields))
				: "",
			firstSeenAt: c.firstSeenAt?.toISOString() || "",
			lastSeenAt: c.lastSeenAt?.toISOString() || "",
			createdAt: c.createdAt?.toISOString() || "",
		}));

		const csv = Papa.unparse(csvData);

		return new NextResponse(csv, {
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="contacts-${Date.now()}.csv"`,
			},
		});
	} catch (error) {
		console.error("Error in GET /api/admin/contacts/export:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
