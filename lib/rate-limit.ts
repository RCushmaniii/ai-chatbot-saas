import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isProductionEnvironment, isTestEnvironment } from "@/lib/constants";

// ---------------------------------------------------------------------------
// In-memory fallback (single-instance only — dev / testing)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
if (typeof setInterval !== "undefined") {
	setInterval(() => {
		const now = Date.now();
		for (const [key, entry] of memoryStore) {
			if (now > entry.resetAt) {
				memoryStore.delete(key);
			}
		}
	}, 60_000);
}

function memoryRateLimit(
	key: string,
	maxRequests: number,
	windowSeconds: number,
): Response | null {
	const now = Date.now();
	const entry = memoryStore.get(key);

	if (!entry || now > entry.resetAt) {
		memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
		return null;
	}

	if (entry.count >= maxRequests) {
		return Response.json(
			{ error: "Too many requests. Please try again later." },
			{
				status: 429,
				headers: {
					"Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
				},
			},
		);
	}

	entry.count++;
	return null;
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (production)
// ---------------------------------------------------------------------------

// Accept both UPSTASH_* (native SDK default) and KV_* (Vercel marketplace
// Upstash integration). Redis.fromEnv() only reads UPSTASH_*; projects using
// the Vercel marketplace get KV_* injected instead and would silently fall back
// to in-memory without this dual-credential check.
function getRedisClient(): Redis | null {
	const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
	const token =
		process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
	if (!url || !token) return null;
	try {
		return new Redis({ url, token });
	} catch {
		return null;
	}
}

const redisClient = getRedisClient();
const redisAvailable = redisClient !== null;

const limiters = new Map<string, Ratelimit>();

function getOrCreateLimiter(
	routeKey: string,
	maxRequests: number,
	windowSeconds: number,
): Ratelimit {
	const cacheKey = `${routeKey}:${maxRequests}:${windowSeconds}`;
	let limiter = limiters.get(cacheKey);
	if (!limiter) {
		limiter = new Ratelimit({
			redis: redisClient!,
			limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
			prefix: `rl:${routeKey}`,
		});
		limiters.set(cacheKey, limiter);
	}
	return limiter;
}

// ---------------------------------------------------------------------------
// Public API — drop-in replacement, same interface as before
// ---------------------------------------------------------------------------

interface RateLimitConfig {
	/** Maximum number of requests allowed in the window */
	maxRequests: number;
	/** Time window in seconds */
	windowSeconds: number;
}

/**
 * Rate-limit an incoming request. Returns a 429 Response if blocked, or null if allowed.
 */
export async function rateLimit(
	request: Request,
	routeKey: string,
	config: RateLimitConfig,
): Promise<Response | null> {
	// Bypass in test env so a Playwright suite making many sequential requests
	// from the same CI runner IP doesn't burn the per-IP budget mid-suite.
	if (isTestEnvironment) return null;

	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown";

	const key = `${routeKey}:${ip}`;

	if (!redisAvailable) {
		if (isProductionEnvironment) {
			// Fail closed: Redis must be available in production. A missing
			// UPSTASH_REDIS_REST_URL/TOKEN is a misconfiguration, not a transient
			// failure — returning 503 is safer than silently allowing unlimited traffic.
			console.error(
				"[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set in production. " +
					"Failing closed to prevent cost overrun.",
			);
			return Response.json(
				{ error: "Service temporarily unavailable. Please try again shortly." },
				{ status: 503, headers: { "Retry-After": "30" } },
			);
		}
		// Development: in-memory fallback is acceptable for single-instance local dev
		return memoryRateLimit(key, config.maxRequests, config.windowSeconds);
	}

	const limiter = getOrCreateLimiter(
		routeKey,
		config.maxRequests,
		config.windowSeconds,
	);

	let success: boolean;
	let reset: number;

	try {
		({ success, reset } = await limiter.limit(key));
	} catch (err) {
		// Transient Redis failure in production: fail closed rather than allow
		// unlimited traffic. Log the error so Sentry captures it.
		console.error("[rate-limit] Redis error during limit check:", err);
		return Response.json(
			{ error: "Service temporarily unavailable. Please try again shortly." },
			{ status: 503, headers: { "Retry-After": "10" } },
		);
	}

	if (!success) {
		return Response.json(
			{ error: "Too many requests. Please try again later." },
			{
				status: 429,
				headers: {
					"Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
					"X-RateLimit-Limit": String(config.maxRequests),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
				},
			},
		);
	}

	return null;
}
