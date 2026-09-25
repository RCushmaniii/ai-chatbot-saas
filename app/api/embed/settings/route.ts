import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { botSettings, membership } from "@/lib/db/schema";

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

/**
 * The business this deployment's public widget serves.
 *
 * .trim() is load-bearing: env values set via some CLIs carry a trailing
 * newline, and an untrimmed UUID makes Postgres throw 22P02 (invalid uuid).
 * Same reasoning as app/api/embed/chat/route.ts.
 */
const servingBusinessId = process.env.DEFAULT_BUSINESS_ID?.trim() || undefined;
const servingBotId = process.env.DEFAULT_BOT_ID?.trim() || undefined;

/**
 * A tenant's configured copy, per language.
 *
 * Starter questions and the input placeholder are stored by the admin UI as
 * single strings, in whichever language they were typed. The widget then used
 * them verbatim and they OVERRODE its own bilingual defaults — so on
 * cushlabs.ai/es the frame rendered in Spanish ("¡Hola!", "Preguntas rápidas:")
 * while the four question chips and the placeholder stayed in English. A
 * Spanish-speaking visitor was shown a half-translated widget on a page that is
 * otherwise entirely Spanish.
 *
 * Each item may now carry a `question_es` alongside `question`, and
 * embedSettings may carry `placeholder_es`. When the requested language has no
 * translation, the value is dropped rather than substituted, and the widget
 * falls back to its own built-in copy for that language.
 *
 * DROPPING IS THE POINT. Returning the English string on a Spanish page is what
 * the bug was. A missing translation should degrade to a correct generic
 * phrase, never to the wrong language.
 */
function localize(
	row: {
		starterQuestions: Array<{ question?: string; question_es?: string }> | null;
		embedSettings: Record<string, unknown> | null;
	},
	lang: "en" | "es",
) {
	const questions = (row.starterQuestions ?? [])
		.map((q) =>
			lang === "es" ? (q.question_es ?? null) : (q.question ?? null),
		)
		.filter((q): q is string => Boolean(q?.trim()));

	const embed = { ...(row.embedSettings ?? {}) } as Record<string, unknown>;
	if (lang === "es") {
		const es = embed.placeholder_es;
		if (typeof es === "string" && es.trim()) embed.placeholder = es;
		else delete embed.placeholder;
		const welcomeEs = embed.welcomeMessage_es;
		if (typeof welcomeEs === "string" && welcomeEs.trim())
			embed.welcomeMessage = welcomeEs;
	}
	delete embed.placeholder_es;
	delete embed.welcomeMessage_es;

	return { questions, embed };
}

export async function GET(request: Request) {
	const lang =
		new URL(request.url).searchParams.get("language") === "es" ? "es" : "en";
	try {
		/**
		 * Scoped to THIS deployment's business, not "whatever row was saved last".
		 *
		 * This route used to select the single most recently updated bot_settings
		 * row across the entire table, with no tenant predicate at all. On a
		 * multi-tenant database that is a cross-tenant leak by construction: the
		 * public widget would render another business's bot name, icon and starter
		 * questions the moment that business saved their settings. It went
		 * unnoticed because production has held exactly one bot_settings row.
		 *
		 * botSettings is keyed by userId, so the business is reached through the
		 * owner Membership — the same join getBusinessPersona() uses, kept
		 * deliberately identical so the widget's appearance and its persona can
		 * never resolve to two different businesses.
		 *
		 * The unscoped query is kept as the fallback for deployments that have no
		 * DEFAULT_BUSINESS_ID set, so nothing that works today stops working.
		 */
		const settings = servingBusinessId
			? await db
					.select({
						botName: botSettings.botName,
						starterQuestions: botSettings.starterQuestions,
						embedSettings: botSettings.embedSettings,
					})
					.from(botSettings)
					.innerJoin(membership, eq(membership.userId, botSettings.userId))
					.where(
						and(
							eq(membership.businessId, servingBusinessId),
							eq(membership.role, "owner"),
						),
					)
					.orderBy(desc(botSettings.updatedAt))
					.limit(1)
			: await db
					.select({
						botName: botSettings.botName,
						starterQuestions: botSettings.starterQuestions,
						embedSettings: botSettings.embedSettings,
					})
					.from(botSettings)
					.orderBy(desc(botSettings.updatedAt))
					.limit(1);

		if (settings.length === 0) {
			// Return defaults if no settings found
			return NextResponse.json({
				...DEFAULT_EMBED_SETTINGS,
				businessId: servingBusinessId ?? null,
				botId: servingBotId ?? null,
			});
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
		const localized = localize(row as Parameters<typeof localize>[0], lang);

		/**
		 * An empty list after localization means the tenant has questions
		 * configured but none in THIS language. Returning `undefined` rather than
		 * an empty array lets the widget fall back to its own bilingual defaults —
		 * an empty array would render the "Quick questions:" heading with nothing
		 * under it, which reads as broken.
		 */
		const suggestedQuestions =
			localized.questions.length > 0 ? localized.questions : undefined;

		/**
		 * businessId and botId are returned so the widget can send them back on
		 * every message. Without them the chat route's conversation-logging block
		 * never runs — see the comment on that guard. They are ids the widget is
		 * already being served by, not secrets: the same values are embedded in
		 * every public widget install.
		 */
		const embedSettings = {
			...DEFAULT_EMBED_SETTINGS,
			...localized.embed,
			botName: row.botName ?? DEFAULT_EMBED_SETTINGS.botName,
			// Omitted entirely when this language has no tenant-configured copy, so
			// the widget uses its own translation instead of the other language's.
			...(suggestedQuestions ? { suggestedQuestions } : {}),
			...(localized.embed.placeholder === undefined
				? { placeholder: undefined }
				: {}),
			language: lang,
			businessId: servingBusinessId ?? null,
			botId: servingBotId ?? null,
		};

		return NextResponse.json(embedSettings);
	} catch (error) {
		console.error("Error fetching embed settings:", error);
		// Return defaults on error
		return NextResponse.json({
			...DEFAULT_EMBED_SETTINGS,
			businessId: servingBusinessId ?? null,
			botId: servingBotId ?? null,
		});
	}
}
