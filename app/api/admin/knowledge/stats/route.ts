import postgres from "postgres";
import { requirePermission } from "@/lib/auth";

const client = postgres(process.env.POSTGRES_URL!);

export async function GET() {
	try {
		const { user, error } = await requirePermission("knowledge:view");
		if (error) return error;

		// Get count from website_content table scoped to business
		const websiteResult = await client`
      SELECT COUNT(*) as count FROM website_content
      WHERE business_id = ${user.businessId}
    `;

		// Get count from Document_Knowledge table scoped to business
		const manualResult = await client`
      SELECT COUNT(*) as count FROM "Document_Knowledge"
      WHERE business_id = ${user.businessId}
    `;

		return Response.json({
			websiteContent: Number(websiteResult[0]?.count || 0),
			manualContent: Number(manualResult[0]?.count || 0),
		});
	} catch (error) {
		console.error("Error fetching knowledge base stats:", error);
		return Response.json({ error: "Failed to fetch stats" }, { status: 500 });
	}
}
