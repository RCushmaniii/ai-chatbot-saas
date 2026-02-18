import postgres from "postgres";
import { requirePermission } from "@/lib/auth";

const client = postgres(process.env.POSTGRES_URL!);

export async function DELETE() {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		// Only clear website content for this business
		await client`
			DELETE FROM "Document_Knowledge"
			WHERE business_id = ${user.businessId}
			AND metadata::jsonb->>'type' = 'website'
		`;

		return Response.json({
			success: true,
			message: "Website content cleared successfully",
		});
	} catch (error) {
		console.error("Error clearing website content:", error);
		return Response.json(
			{ error: "Failed to clear website content" },
			{ status: 500 },
		);
	}
}
