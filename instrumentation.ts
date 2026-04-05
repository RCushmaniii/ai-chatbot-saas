import * as Sentry from "@sentry/nextjs";
import { registerOTel } from "@vercel/otel";

export function register() {
	registerOTel({ serviceName: "ai-chatbot" });

	// Validate environment variables at startup — fails fast in production
	// if required vars are missing. Uses dynamic import to avoid bundling
	// the validation module into the client.
	import("./lib/env");
}

export const onRequestError = Sentry.captureRequestError;
