/**
 * Rate limiter for API routes.
 *
 * Production: Uses Upstash Redis (works across Vercel serverless instances).
 * Development: Falls back to in-memory if UPSTASH_REDIS_REST_URL is not set.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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
					"Retry-After": String(
						Math.ceil((entry.resetAt - now) / 1000),
					),
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

const redisAvailable = Boolean(
	process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

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
			redis: Redis.fromEnv(),
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
	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown";

	const key = `${routeKey}:${ip}`;

	// Fall back to in-memory when Redis is not configured
	if (!redisAvailable) {
		return memoryRateLimit(key, config.maxRequests, config.windowSeconds);
	}

	const limiter = getOrCreateLimiter(
		routeKey,
		config.maxRequests,
		config.windowSeconds,
	);

	const { success, reset } = await limiter.limit(key);

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
