import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
	replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.1,
	replaysOnErrorSampleRate: 1.0,
	integrations: [
		Sentry.replayIntegration(),
		Sentry.browserTracingIntegration(),
	],
	debug: false,
});
