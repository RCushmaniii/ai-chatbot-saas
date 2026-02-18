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

		// Convert to CSV
		const csvData = contacts.map((c) => ({
			id: c.id,
			email: c.email || "",
			phone: c.phone || "",
			name: c.name || "",
			status: c.status,
			leadScore: c.leadScore || 0,
			tags: (c.tags as string[])?.join(";") || "",
			customFields: c.customFields ? JSON.stringify(c.customFields) : "",
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
