import postgres from "postgres";
import { isProductionEnvironment, isTestEnvironment } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Postgres-backed sliding-window rate limiter.
// Shared state across Vercel serverless instances via the existing Postgres
// connection — no Redis vendor required.
// ---------------------------------------------------------------------------

interface RateLimitConfig {
	/** Maximum number of requests allowed in the window */
	maxRequests: number;
	/** Time window in seconds */
	windowSeconds: number;
}

let _client: ReturnType<typeof postgres> | null = null;
function getClient() {
	if (_client) return _client;
	if (!process.env.POSTGRES_URL) return null;
	_client = postgres(process.env.POSTGRES_URL);
	return _client;
}

// Probabilistic GC: ~1% of requests purge rows older than 1 hour. Keeps the
// RateLimit table bounded without a dedicated cron job. Anything older than
// any plausible window is dead weight.
async function maybeCleanup(client: ReturnType<typeof postgres>) {
	if (Math.random() > 0.01) return;
	try {
		await client`DELETE FROM "RateLimit" WHERE ts < NOW() - INTERVAL '1 hour'`;
	} catch (err) {
		console.error("[rate-limit] GC failed:", err);
	}
}

/**
 * Rate-limit an incoming request. Returns a 429 Response if blocked, 503 if
 * the database is unavailable in production, or null if allowed.
 */
export async function rateLimit(
	request: Request,
	routeKey: string,
	config: RateLimitConfig,
): Promise<Response | null> {
	// Bypass in test env — a Playwright suite making many sequential requests
	// from the same CI runner IP would burn the per-IP budget mid-suite.
	if (isTestEnvironment) return null;

	const client = getClient();
	if (!client) {
		if (isProductionEnvironment) {
			console.error(
				"[rate-limit] POSTGRES_URL not set in production. Failing closed.",
			);
			return Response.json(
				{ error: "Service temporarily unavailable. Please try again shortly." },
				{ status: 503, headers: { "Retry-After": "30" } },
			);
		}
		return null;
	}

	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown";

	const key = `${routeKey}:${ip}`;
	const { maxRequests, windowSeconds } = config;

	try {
		// One round-trip sliding window: count active requests, insert this one
		// iff under the cap, return state. The CTE evaluates window_state once
		// and the conditional INSERT either fires (allowed) or no-ops (blocked).
		const rows = await client`
			WITH window_state AS (
				SELECT
					COUNT(*)::int AS request_count,
					MIN(ts) AS earliest_ts
				FROM "RateLimit"
				WHERE key = ${key}
					AND ts > NOW() - make_interval(secs => ${windowSeconds})
			),
			inserted AS (
				INSERT INTO "RateLimit" (key, ts)
				SELECT ${key}, NOW()
				FROM window_state
				WHERE request_count < ${maxRequests}
				RETURNING ts
			)
			SELECT
				(SELECT request_count FROM window_state) AS request_count,
				(SELECT earliest_ts FROM window_state) AS earliest_ts,
				EXISTS(SELECT 1 FROM inserted) AS allowed
		`;

		const row = rows[0];
		const allowed = row.allowed as boolean;

		// Fire-and-forget GC — never blocks the response
		void maybeCleanup(client);

		if (allowed) return null;

		const earliestTs = row.earliest_ts as Date | null;
		const resetAt = earliestTs
			? earliestTs.getTime() + windowSeconds * 1000
			: Date.now() + windowSeconds * 1000;
		const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

		return Response.json(
			{ error: "Too many requests. Please try again later." },
			{
				status: 429,
				headers: {
					"Retry-After": String(retryAfter),
					"X-RateLimit-Limit": String(maxRequests),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
				},
			},
		);
	} catch (err) {
		console.error("[rate-limit] Postgres error during limit check:", err);
		if (isProductionEnvironment) {
			return Response.json(
				{
					error: "Service temporarily unavailable. Please try again shortly.",
				},
				{ status: 503, headers: { "Retry-After": "10" } },
			);
		}
		return null;
	}
}
