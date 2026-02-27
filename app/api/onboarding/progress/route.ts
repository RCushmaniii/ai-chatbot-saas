import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!);

const progressSchema = z.object({
	step: z.number().min(1).max(4),
	businessName: z.string().min(1).max(100).optional(),
	botName: z.string().min(1).max(100).optional(),
});

export async function POST(request: Request) {
	const user = await getAuthUser();
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const parsed = progressSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid request", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { step, businessName, botName } = parsed.data;

	try {
		// Update onboarding step
		await sql`
			UPDATE "Business"
			SET onboarding_step = ${step}
			WHERE id = ${user.businessId}
		`;

		// If step 1 data provided, update business and bot names
		if (businessName) {
			await sql`
				UPDATE "Business"
				SET name = ${businessName}
				WHERE id = ${user.businessId}
			`;
		}

		if (botName) {
			await sql`
				UPDATE "Bot"
				SET name = ${botName}
				WHERE "businessId" = ${user.businessId}
			`;
		}

		return Response.json({ success: true });
	} catch (error) {
		console.error("Failed to save onboarding progress:", error);
		return Response.json(
			{ error: "Failed to save progress" },
			{ status: 500 },
		);
	}
}
