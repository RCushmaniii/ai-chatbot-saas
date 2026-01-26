import postgres from "postgres";
import { auth } from "@/app/(auth)/auth";

const client = postgres(process.env.POSTGRES_URL!);

export async function DELETE() {
	try {
		const session = await auth();
		if (!session?.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Clear the website_content table
		await client`TRUNCATE TABLE website_content`;

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
