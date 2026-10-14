import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { botSettings } from "@/lib/db/schema";
import { HEX_COLOR_PATTERN } from "@/lib/embed/sanitize";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Everything saved here can reach a visitor's browser on a customer's site, so
 * it is validated on the way in, not only on the way out. Colors are hex only
 * (#abc / #aabbcc) — the same rule the embed script applies — so a value like
 * "red;background:url(x)" is refused at save time with a 400 rather than
 * stored and silently dropped later.
 *
 * Fields are optional because each admin screen saves only its own part
 * (starter questions, or name + instructions). Unknown keys are stripped.
 */
const hexColor = z.string().regex(new RegExp(HEX_COLOR_PATTERN));
const settingsSchema = z.object({
	botName: z.string().trim().max(100).optional(),
	customInstructions: z.string().max(20_000).optional(),
	starterQuestions: z
		.array(
			z.object({
				id: z.string().max(64),
				question: z.string().max(300),
				question_es: z.string().max(300).optional(),
				emoji: z.string().max(16).optional(),
			}),
		)
		.max(12)
		.optional(),
	colors: z
		.object({
			primary: hexColor.optional(),
			background: hexColor.optional(),
			userMessage: hexColor.optional(),
		})
		.optional(),
	settings: z
		.object({
			showTimestamps: z.boolean().optional(),
			showCitations: z.boolean().optional(),
			language: z.enum(["en", "es"]).optional(),
		})
		.optional(),
});

export async function GET() {
	try {
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

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
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const parsed = settingsSchema.safeParse(await request.json());
		if (!parsed.success) {
			return Response.json(
				{ error: "Invalid settings", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}
		const {
			botName,
			customInstructions,
			starterQuestions,
			colors,
			settings: userSettings,
		} = parsed.data;

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
