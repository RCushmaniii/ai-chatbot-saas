import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!);

const completeSchema = z.object({
	status: z.enum(["completed", "skipped"]),
});

export async function POST(request: Request) {
	const user = await getAuthUser();
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const parsed = completeSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid request", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { status } = parsed.data;

	try {
		await sql`
			UPDATE "Business"
			SET onboarding_status = ${status}
			WHERE id = ${user.businessId}
		`;

		return Response.json({ success: true });
	} catch (error) {
		console.error("Failed to complete onboarding:", error);
		return Response.json(
			{ error: "Failed to complete onboarding" },
			{ status: 500 },
		);
	}
}
