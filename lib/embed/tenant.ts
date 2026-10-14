/**
 * Which business a public widget request is answered as.
 *
 * The answer comes from THIS DEPLOYMENT, never from the request.
 *
 * /api/embed/chat used to read `businessId ?? DEFAULT_BUSINESS_ID`, taking the
 * body's value first. The body is written by whoever sends the request, so any
 * visitor could name another tenant's id and be answered as that business —
 * from its knowledge base, in its persona, logged into its conversations and
 * counted against its monthly message quota. Verified on production
 * 2026-10-14: a made-up id was honoured (the route threw instead of answering
 * as CushLabs).
 *
 * The widget still sends businessId/botId (it learns them from
 * /api/embed/settings) and that is fine: a value that MATCHES the deployment is
 * accepted, a value that differs is refused. Refusing beats silently
 * substituting, because a mismatch means either a misconfigured install or a
 * probe, and both should be visible.
 *
 * .trim() is load-bearing: env values set via some CLIs carry a trailing
 * newline, and an untrimmed UUID makes Postgres throw 22P02 (invalid uuid).
 */

export type EmbedTenant =
	| { ok: true; businessId: string | undefined; botId: string | undefined }
	| { ok: false; reason: "foreign-business" | "foreign-bot" };

function clean(value: unknown): string | undefined {
	return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function resolveEmbedTenant(
	body: { businessId?: unknown; botId?: unknown },
	env: Record<string, string | undefined> = process.env as Record<
		string,
		string | undefined
	>,
): EmbedTenant {
	const businessId = clean(env.DEFAULT_BUSINESS_ID);
	const botId = clean(env.DEFAULT_BOT_ID);

	const askedBusiness = clean(body.businessId);
	const askedBot = clean(body.botId);

	if (askedBusiness !== undefined && askedBusiness !== businessId) {
		return { ok: false, reason: "foreign-business" };
	}
	if (askedBot !== undefined && askedBot !== botId) {
		return { ok: false, reason: "foreign-bot" };
	}
	return { ok: true, businessId, botId };
}
