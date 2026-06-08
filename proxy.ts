import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
	type NextFetchEvent,
	type NextRequest,
	NextResponse,
} from "next/server";

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
 * Routes that must be embeddable as iframes on third-party customer sites.
 * The widget loader (`/api/embed`) injects an iframe pointing at `/embed/chat`
 * from any customer domain, so frame-ancestors must allow `*` and
 * X-Frame-Options must not be set.
 */
function isEmbeddableRoute(pathname: string): boolean {
	return pathname.startsWith("/embed");
}

/**
 * Security headers applied to all responses.
 */
function applySecurityHeaders(
	response: NextResponse,
	pathname: string,
): NextResponse {
	const embeddable = isEmbeddableRoute(pathname);

	// Prevent MIME type sniffing
	response.headers.set("X-Content-Type-Options", "nosniff");

	// Clickjacking protection. Embeddable routes intentionally omit X-Frame-Options
	// so customer sites can iframe the widget. CSP frame-ancestors below carries
	// the same intent for browsers that honor CSP.
	if (!embeddable) {
		response.headers.set("X-Frame-Options", "SAMEORIGIN");
	}

	// Control referrer information
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

	// Restrict browser features
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), browsing-topics=()",
	);

	// Content Security Policy. Embeddable routes allow any frame-ancestor so the
	// widget renders on customer sites; everything else stays locked to self.
	const frameAncestors = embeddable
		? "frame-ancestors *"
		: "frame-ancestors 'self'";

	response.headers.set(
		"Content-Security-Policy",
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' blob: data: https://img.clerk.com https://avatar.vercel.sh https://*.public.blob.vercel-storage.com",
			"font-src 'self' data:",
			"media-src 'self' blob:",
			"worker-src 'self' blob:",
			"connect-src 'self' https://*.clerk.accounts.dev https://clerk-telemetry.com https://api.stripe.com https://api.openai.com https://vitals.vercel-insights.com https://*.ingest.us.sentry.io",
			"frame-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
			frameAncestors,
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

const clerk = clerkMiddleware(async (auth, request) => {
	const response = NextResponse.next();
	const { pathname } = new URL(request.url);

	// Apply security headers to all responses
	applySecurityHeaders(response, pathname);

	// Allow public routes without authentication
	if (isPublicRoute(request)) {
		return response;
	}

	// Protect all non-public routes
	await auth.protect();

	return response;
});

/**
 * The public embed widget must be COMPLETELY Clerk-free. It renders in a
 * cross-origin iframe on customer sites, where Clerk's dev-browser handshake
 * and auth iframes are CSP-blocked and blank the page. So short-circuit /embed
 * before clerkMiddleware ever runs — but still apply the security headers
 * (notably `frame-ancestors *`) so the iframe is allowed to load.
 */
export default function middleware(
	request: NextRequest,
	event: NextFetchEvent,
) {
	const { pathname } = new URL(request.url);
	if (pathname.startsWith("/embed")) {
		return applySecurityHeaders(NextResponse.next(), pathname);
	}
	return clerk(request, event);
}

export const config = {
	matcher: [
		// Skip Next.js internals and all static files
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt|mp4|webm|ogg|mp3|wav)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
