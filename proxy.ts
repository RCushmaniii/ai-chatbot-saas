import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Public routes that don't require authentication.
 * Everything else the proxy matches is protected by Clerk.
 *
 * Several of these prefixes are also EXCLUDED from `config.matcher` below, so
 * the proxy never runs for them at all. They stay listed here so that, if a
 * matcher exclusion is ever removed, the route is still public rather than
 * suddenly protected.
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
	"/api/health(.*)",
]);

// Security headers (CSP, X-Frame-Options, HSTS, ...) are NOT set here. They live
// in next.config.ts `headers()`, which Vercel applies without running a function,
// so they reach every route — including the ones this proxy no longer runs on.

export default clerkMiddleware(async (auth, request) => {
	// Allow public routes without authentication
	if (isPublicRoute(request)) {
		return NextResponse.next();
	}

	// Protect all non-public routes
	await auth.protect();

	return NextResponse.next();
});

/**
 * Where the proxy runs — and, more importantly, where it does NOT.
 *
 * Every proxy invocation is billed Fluid Active CPU on Vercel. With the stock
 * Clerk matcher it ran on every page and API request, including the embeddable
 * widget customers load on their own sites. The exclusions below are routes
 * that (a) are already public in `isPublicRoute`, so excluding them removes no
 * protection, and (b) never call Clerk's server helpers (`auth()` /
 * `currentUser()`), which throw unless the proxy ran first:
 *
 *   /embed/*          widget iframe page (was already short-circuited past Clerk)
 *   /api/embed/*      widget loader script + widget chat/settings/capture APIs
 *   /api/webhooks/*   Stripe + messaging-platform webhooks (signature-verified)
 *   /api/clerk/*      Clerk webhook (svix-verified)
 *   /api/cron/*       Vercel Cron (CRON_SECRET-verified in the route)
 *   /api/plans        public plan list for the pricing page
 *   /api/health       health check
 *   /ping, /pricing, /demo, /demo-ny-english   public marketing pages
 *
 * Still matched, on purpose:
 *   /                 calls getAuthUser() -> auth() to route signed-in users
 *   /sign-in, /sign-up, /login, /register     Clerk handshake
 *   /chat, /admin, /documentation, /onboarding, /checkout, and all other
 *   /api/* routes     protected; route handlers call auth()
 *   /monitoring       Sentry tunnel — left exactly as it was
 *   anything unknown  fails closed (protected), as before
 */
export const config = {
	matcher: [
		// Pages: skip Next.js internals, static files, and the public routes above.
		"/((?!_next|embed|api/embed|api/webhooks|api/clerk|api/cron|api/plans|api/health|ping|pricing|demo|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt|mp4|webm|ogg|mp3|wav)).*)",
		// API routes (even ones that look like static files), minus the public ones.
		"/(api|trpc)((?!/embed|/webhooks|/clerk|/cron|/plans|/health).*)",
	],
};
