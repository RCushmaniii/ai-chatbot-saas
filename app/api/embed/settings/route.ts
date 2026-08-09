import { desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { botSettings } from "@/lib/db/schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Default embed settings
const DEFAULT_EMBED_SETTINGS = {
	buttonColor: "#4f46e5",
	buttonSize: 1.0,
	position: "bottom-right" as const,
	welcomeMessage: "Hello! How can I help you today?",
	placeholder: "Type your message...",
	botIcon: "💬",
	botName: "AI Assistant",
	suggestedQuestions: [
		"What services do you offer?",
		"How much does it cost?",
		"How do I book a call?",
	],
};

export async function GET() {
	try {
		// Get the most recent bot settings (no auth required for embed)
		const settings = await db
			.select()
			.from(botSettings)
			.orderBy(desc(botSettings.updatedAt))
			.limit(1);

		if (settings.length === 0) {
			// Return defaults if no settings found
			return NextResponse.json(DEFAULT_EMBED_SETTINGS);
		}

		const row = settings[0];

		/**
		 * starterQuestions is the ONLY configurable source, then the defaults.
		 *
		 * embedSettings.suggestedQuestions used to sit between the two as a second
		 * fallback, and nothing ever wrote it — the admin UI
		 * (components/admin-starter-questions.tsx) writes starterQuestions, and
		 * this route already preferred that. So it was a field that could only be
		 * populated by editing a live jsonb column by hand, for a value that would
		 * then be overridden by any tenant who configured the real one.
		 *
		 * Two fields for one concept is the same second-copy problem removed from
		 * business_unit in the operating-system repo on 2026-08-09: two places can
		 * disagree, and nothing compares them. Deleted rather than wired up,
		 * because starterQuestions is the one with a UI behind it.
		 */
		const suggestedQuestions =
			row.starterQuestions && row.starterQuestions.length > 0
				? row.starterQuestions.map((q) => q.question)
				: DEFAULT_EMBED_SETTINGS.suggestedQuestions;

		// Merge with defaults to ensure all fields are present
		const embedSettings = {
			...DEFAULT_EMBED_SETTINGS,
			...(row.embedSettings ?? {}),
			botName: row.botName ?? DEFAULT_EMBED_SETTINGS.botName,
			suggestedQuestions,
		};

		return NextResponse.json(embedSettings);
	} catch (error) {
		console.error("Error fetching embed settings:", error);
		// Return defaults on error
		return NextResponse.json(DEFAULT_EMBED_SETTINGS);
	}
}
