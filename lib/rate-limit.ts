/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach with automatic cleanup.
 *
 * For production at scale, consider migrating to Redis-based
 * rate limiting (e.g., @upstash/ratelimit) for multi-instance support.
 */

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		if (now > entry.resetAt) {
			store.delete(key);
		}
	}
}, 60_000);

interface RateLimitConfig {
	/** Maximum number of requests allowed in the window */
	maxRequests: number;
	/** Time window in seconds */
	windowSeconds: number;
}

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
}

/**
 * Check and consume a rate limit token.
 * @param key - Unique identifier (e.g., IP address, API key, or route+IP combo)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining tokens
 */
export function checkRateLimit(
	key: string,
	config: RateLimitConfig,
): RateLimitResult {
	const now = Date.now();
	const entry = store.get(key);

	// If no entry or window expired, create fresh entry
	if (!entry || now > entry.resetAt) {
		const resetAt = now + config.windowSeconds * 1000;
		store.set(key, { count: 1, resetAt });
		return { allowed: true, remaining: config.maxRequests - 1, resetAt };
	}

	// Window still active — check limit
	if (entry.count >= config.maxRequests) {
		return { allowed: false, remaining: 0, resetAt: entry.resetAt };
	}

	// Consume a token
	entry.count++;
	return {
		allowed: true,
		remaining: config.maxRequests - entry.count,
		resetAt: entry.resetAt,
	};
}

/**
 * Create a rate-limited response wrapper for API routes.
 * Extracts IP from request headers and applies the rate limit.
 */
export function rateLimit(
	request: Request,
	routeKey: string,
	config: RateLimitConfig,
): Response | null {
	// Extract IP from common headers (Vercel, Cloudflare, etc.)
	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown";

	const key = `${routeKey}:${ip}`;
	const result = checkRateLimit(key, config);

	if (!result.allowed) {
		return Response.json(
			{ error: "Too many requests. Please try again later." },
			{
				status: 429,
				headers: {
					"Retry-After": String(
						Math.ceil((result.resetAt - Date.now()) / 1000),
					),
					"X-RateLimit-Limit": String(config.maxRequests),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
				},
			},
		);
	}

	return null; // Allowed — continue processing
}
