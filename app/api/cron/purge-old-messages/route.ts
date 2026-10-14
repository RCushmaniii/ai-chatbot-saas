import { NextResponse } from "next/server";
import postgres from "postgres";

/**
 * Privacy retention job, 90 days:
 *
 *   1. Message bodies older than 90 days are deleted.
 *   2. Conversations idle for 90 days lose what identifies the visit: the page
 *      address and site origin, any referrer, IP or browser string, and the
 *      pseudonymous visitor and session ids. Until 2026-10-14 only step 1 ran,
 *      so the page a visitor was reading was kept forever. The row itself stays
 *      (business, channel, dates, status, the linked contact) for analytics
 *      and contact attribution. A contact is a lead the visitor chose to leave
 *      and is kept until the business deletes it. WhatsApp phone numbers stay
 *      on the row because the WhatsApp channel finds its conversation by them.
 *
 *   3. Rate-limit rows, which are keyed by IP address, are deleted once they
 *      are a day old. The limiter's own cleanup only runs on ~1% of requests,
 *      so on a quiet day it could leave them indefinitely.
 *
 * What is kept and for how long is disclosed on /privacy
 * (app/privacy/page.tsx). Change both together.
 *
 * The window is conservative — long enough that lead-handoff / live-chat
 * review cases work, short enough to limit privacy exposure under
 * Mexico's LFPDPPP and similar regimes.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RETENTION_DAYS = 90;

const sql = postgres(process.env.POSTGRES_URL!);

export async function GET(request: Request) {
	try {
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET;
		if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

		const result = await sql`
			DELETE FROM "WidgetMessage"
			WHERE created_at < ${cutoff}
		`;

		const stripped = await sql`
			UPDATE "WidgetConversation"
			SET metadata = metadata - 'pageUrl' - 'origin' - 'referrer' - 'ip' - 'userAgent' - 'whatsappName',
				visitor_id = NULL,
				session_id = NULL
			WHERE updated_at < ${cutoff}
				AND (
					visitor_id IS NOT NULL
					OR session_id IS NOT NULL
					OR metadata ?| array['pageUrl', 'origin', 'referrer', 'ip', 'userAgent', 'whatsappName']
				)
		`;

		const rateLimitRows = await sql`
			DELETE FROM "RateLimit"
			WHERE ts < NOW() - INTERVAL '1 day'
		`;

		console.log(
			`[cron] purge-old-messages: deleted ${result.count} messages and stripped ${stripped.count} conversations older than ${cutoff.toISOString()}`,
		);

		return NextResponse.json({
			success: true,
			deletedCount: result.count,
			conversationsStripped: stripped.count,
			rateLimitRowsDeleted: rateLimitRows.count,
			retentionDays: RETENTION_DAYS,
			cutoff: cutoff.toISOString(),
		});
	} catch (error) {
		console.error("[cron] purge-old-messages failed:", error);
		return NextResponse.json(
			{ error: "Failed to purge messages" },
			{ status: 500 },
		);
	}
}
