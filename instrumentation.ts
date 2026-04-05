import * as Sentry from "@sentry/nextjs";
import { registerOTel } from "@vercel/otel";

export function register() {
	registerOTel({ serviceName: "ai-chatbot" });
}

export const onRequestError = Sentry.captureRequestError;
