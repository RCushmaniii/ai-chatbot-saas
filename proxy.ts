import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Public routes that don't require authentication.
 * Everything else is protected by Clerk middleware.
 */
const isPublicRoute = createRouteMatcher([
	"/",
	"/pricing(.*)",
	"/sign-in(.*)",
	"/sign-up(.*)",
	"/login(.*)",
	"/register(.*)",
	"/ping(.*)",
	"/demo(.*)",
	"/demo-ny-english(.*)",
	"/embed(.*)",
	"/api/embed(.*)",
	"/api/plans(.*)",
	"/api/webhooks(.*)",
	"/api/clerk(.*)",
	"/api/cron(.*)",
]);

/**
 * Security headers applied to all responses.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
	// Prevent MIME type sniffing
	response.headers.set("X-Content-Type-Options", "nosniff");

	// Prevent clickjacking (allow iframes only from same origin)
	response.headers.set("X-Frame-Options", "SAMEORIGIN");

	// Control referrer information
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

	// Restrict browser features
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), browsing-topics=()",
	);

	// Content Security Policy
	response.headers.set(
		"Content-Security-Policy",
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' blob: data: https://img.clerk.com https://avatar.vercel.sh https://*.public.blob.vercel-storage.com",
			"font-src 'self' data:",
			"connect-src 'self' https://*.clerk.accounts.dev https://api.stripe.com https://api.openai.com https://vitals.vercel-insights.com",
			"frame-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
			"frame-ancestors 'self'",
			"base-uri 'self'",
			"form-action 'self'",
		].join("; "),
	);

	// Strict Transport Security (1 year, include subdomains)
	response.headers.set(
		"Strict-Transport-Security",
		"max-age=31536000; includeSubDomains; preload",
	);

	return response;
}

export default clerkMiddleware(async (auth, request) => {
	const response = NextResponse.next();

	// Apply security headers to all responses
	applySecurityHeaders(response);

	// Allow public routes without authentication
	if (isPublicRoute(request)) {
		return response;
	}

	// Protect all non-public routes
	await auth.protect();

	return response;
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
