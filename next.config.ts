import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

/**
 * Headers shared by every route. Moved verbatim from proxy.ts
 * (applySecurityHeaders) on 2026-10-10.
 */
const securityHeaders = [
	// Prevent MIME type sniffing
	{ key: "X-Content-Type-Options", value: "nosniff" },
	// Control referrer information
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	// Restrict browser features
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
	},
	// Strict Transport Security (1 year, include subdomains)
	{
		key: "Strict-Transport-Security",
		value: "max-age=31536000; includeSubDomains; preload",
	},
];

/**
 * Content Security Policy. Only frame-ancestors differs between embeddable and
 * non-embeddable routes.
 */
function contentSecurityPolicy(frameAncestors: string): string {
	return [
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
	].join("; ");
}

const nextConfig: NextConfig = {
	async headers() {
		// Security headers (X-Frame-Options, HSTS, CSP, etc.) live HERE, not in
		// proxy.ts. They used to be set by the proxy, which forced the proxy to run
		// on every request just to stamp headers — including the public widget and
		// marketing pages, which need no auth. Static config headers are applied by
		// Vercel's router at no function-CPU cost, so the proxy matcher could be
		// narrowed to routes that genuinely need Clerk (see proxy.ts).
		//
		// Embeddable routes (/embed/*) are iframed on customer sites: they get
		// `frame-ancestors *` and NO X-Frame-Options. Everything else is locked to
		// 'self'. The two sources below partition the path space exactly the way
		// the old `pathname.startsWith("/embed")` check did.
		return [
			{
				source: "/(.*)",
				headers: [{ key: "X-DNS-Prefetch-Control", value: "on" }],
			},
			{
				source: "/((?!embed).*)",
				headers: [
					...securityHeaders,
					{ key: "X-Frame-Options", value: "SAMEORIGIN" },
					{
						key: "Content-Security-Policy",
						value: contentSecurityPolicy("frame-ancestors 'self'"),
					},
				],
			},
			{
				source: "/embed(.*)",
				headers: [
					...securityHeaders,
					{
						key: "Content-Security-Policy",
						value: contentSecurityPolicy("frame-ancestors *"),
					},
				],
			},
		];
	},
	poweredByHeader: false,
	compress: true,
	images: {
		remotePatterns: [
			{
				hostname: "avatar.vercel.sh",
			},
			{
				protocol: "https",
				//https://nextjs.org/docs/messages/next-image-unconfigured-host
				hostname: "*.public.blob.vercel-storage.com",
			},
			{
				protocol: "https",
				hostname: "img.clerk.com",
			},
		],
	},
	experimental: {
		optimizePackageImports: [
			"date-fns",
			"lucide-react",
			"@radix-ui/react-icons",
			"framer-motion",
		],
	},
};

export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	silent: !process.env.CI,
	// Source-map upload is on automatically when SENTRY_AUTH_TOKEN is set
	// (production CI/Vercel build). widenClientFileUpload extends coverage
	// to chunks that wouldn't otherwise be referenced by uploaded artifacts.
	sourcemaps: { disable: false },
	widenClientFileUpload: true,
	tunnelRoute: "/monitoring",
});
