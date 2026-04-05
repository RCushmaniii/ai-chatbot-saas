import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
	widenClientFileUpload: true,
	tunnelRoute: "/monitoring",
	disableLogger: true,
	automaticVercelMonitors: true,
});
