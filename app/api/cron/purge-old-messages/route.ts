import { NextResponse } from "next/server";
import postgres from "postgres";

/**
 * Privacy retention job: delete widget conversation message bodies older
 * than 90 days. Conversation rows themselves are kept (needed for analytics
 * and contact-attribution), but raw chat content is removed so we're not
 * sitting on years of customer conversations indefinitely.
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

		console.log(
			`[cron] purge-old-messages: deleted ${result.count} messages older than ${cutoff.toISOString()}`,
		);

		return NextResponse.json({
			success: true,
			deletedCount: result.count,
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
