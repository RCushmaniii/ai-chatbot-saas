import postgres from "postgres";
import { auth } from "@/app/(auth)/auth";

const client = postgres(process.env.POSTGRES_URL!);

export async function GET() {
	try {
		const session = await auth();
		if (!session?.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get count from website_content table
		const websiteResult = await client`
      SELECT COUNT(*) as count FROM website_content
    `;

		// Get count from Document_Knowledge table
		const manualResult = await client`
      SELECT COUNT(*) as count FROM "Document_Knowledge"
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
