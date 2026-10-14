import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { botSettings, membership } from "@/lib/db/schema";
import {
	resolveAppearance,
	type SavedAppearance,
} from "@/lib/embed/appearance";
import { isHexColor } from "@/lib/embed/sanitize";
import {
	localizeWidgetText,
	type SavedStarterQuestion,
	type SavedWidgetText,
} from "@/lib/embed/widget-text";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

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
 * Public, read by the chat window AND by the loader on the customer's page
 * (cross-origin, hence the CORS header). Everything here is already public:
 * it is what every visitor of the tenant's site sees.
 *
 * Cached at the CDN for 30 seconds, then served stale for up to 30 more while
 * it refreshes, so a save reaches visitors within about a minute. Nothing else
 * caches it: the loader fetches it on every page load.
 */
const HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET",
	"Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30",
};

/**
 * What the widget needs, for ONE language.
 *
 * Text fields (welcomeMessage, placeholder, suggestedQuestions) are present
 * only when the tenant saved them in THIS language: absent means "use your
 * built-in text for this language" (lib/embed/widget-text.ts). This route used
 * to fill gaps with English defaults ("Hello! How can I help you today?") and
 * with the English welcome on Spanish requests, which is how English text
 * reached Spanish pages.
 *
 * buttonColor and position are present only when SAVED, so the loader can let
 * a saved value win over a script-tag attribute, and an attribute win over its
 * own default. `appearance` is always complete: the resolved chat-window look.
 */
function widgetSettings(
	row: {
		botName: string | null;
		starterQuestions: SavedStarterQuestion[] | null;
		embedSettings: Record<string, unknown> | null;
	} | null,
	lang: "en" | "es",
) {
	const saved = (row?.embedSettings ?? {}) as Record<string, unknown> &
		SavedAppearance;
	const text = localizeWidgetText(
		saved as SavedWidgetText,
		row?.starterQuestions,
		lang,
	);
	return {
		language: lang,
		botName: row?.botName?.trim() || undefined,
		botIcon:
			typeof saved.botIcon === "string" && saved.botIcon.length <= 16
				? saved.botIcon
				: undefined,
		...text,
		buttonColor: isHexColor(saved.buttonColor) ? saved.buttonColor : undefined,
		position:
			saved.position === "bottom-left" || saved.position === "bottom-right"
				? saved.position
				: undefined,
		appearance: resolveAppearance(saved),
		businessId: servingBusinessId ?? null,
		botId: servingBotId ?? null,
	};
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

		/**
		 * starterQuestions is the ONLY configurable source of quick questions;
		 * the duplicate embedSettings.suggestedQuestions was deleted on
		 * 2026-08-09 (two fields for one concept, nothing comparing them).
		 *
		 * businessId and botId are returned so the widget can send them back on
		 * every message. Without them the chat route's conversation-logging block
		 * never runs. They are the ids every public install is already served by.
		 */
		return NextResponse.json(
			widgetSettings(
				(settings[0] as Parameters<typeof widgetSettings>[0]) ?? null,
				lang,
			),
			{ headers: HEADERS },
		);
	} catch (error) {
		console.error("Error fetching embed settings:", error);
		// The built-in look and text for this language. Not cached: a database
		// blip must not pin the default look on the CDN.
		return NextResponse.json(widgetSettings(null, lang), {
			headers: { ...HEADERS, "Cache-Control": "no-store" },
		});
	}
}
