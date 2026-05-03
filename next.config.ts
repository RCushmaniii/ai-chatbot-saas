import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async headers() {
		// Security headers (X-Frame-Options, HSTS, CSP, etc.) live in proxy.ts
		// as a single source of truth so embeddable routes can be exempted.
		// Only headers that don't interact with embed exemptions live here.
		return [
			{
				source: "/(.*)",
				headers: [{ key: "X-DNS-Prefetch-Control", value: "on" }],
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
