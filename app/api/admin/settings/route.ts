import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getAuthUser } from "@/lib/auth";
import { botSettings } from "@/lib/db/schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET() {
	try {
		const user = await getAuthUser();
		if (!user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get settings for this user
		const settings = await db
			.select()
			.from(botSettings)
			.where(eq(botSettings.userId, user.id))
			.limit(1);

		if (settings.length === 0) {
			return Response.json({ error: "Settings not found" }, { status: 404 });
		}

		return Response.json(settings[0]);
	} catch (error) {
		console.error("Error fetching settings:", error);
		return Response.json(
			{ error: "Failed to fetch settings" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	try {
		const user = await getAuthUser();
		if (!user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const {
			botName,
			customInstructions,
			starterQuestions,
			colors,
			settings: userSettings,
		} = body;

		// Check if settings exist for this user
		const existing = await db
			.select()
			.from(botSettings)
			.where(eq(botSettings.userId, user.id))
			.limit(1);

		if (existing.length === 0) {
			// Create new settings
			await db.insert(botSettings).values({
				userId: user.id,
				botName,
				customInstructions,
				starterQuestions,
				colors,
				settings: userSettings,
				updatedAt: new Date(),
			});
		} else {
			// Update existing settings
			await db
				.update(botSettings)
				.set({
					...(botName !== undefined && { botName }),
					...(customInstructions !== undefined && { customInstructions }),
					...(starterQuestions !== undefined && { starterQuestions }),
					...(colors !== undefined && { colors }),
					...(userSettings !== undefined && { settings: userSettings }),
					updatedAt: new Date(),
				})
				.where(eq(botSettings.userId, user.id));
		}

		return Response.json({ success: true });
	} catch (error) {
		console.error("Error saving settings:", error);
		return Response.json({ error: "Failed to save settings" }, { status: 500 });
	}
}
