import { z } from "zod";

/**
 * Runtime environment validation.
 *
 * Required vars are validated at import time — the app will fail fast
 * with a clear error message if any are missing.
 *
 * Optional vars are typed but allowed to be undefined.
 */

const serverSchema = z.object({
	// Database
	POSTGRES_URL: z.string().min(1, "POSTGRES_URL is required"),

	// Auth (Clerk)
	CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
	CLERK_WEBHOOK_SECRET: z.string().min(1, "CLERK_WEBHOOK_SECRET is required"),

	// AI
	OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

	// Billing (Stripe)
	STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),

	// App
	NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),

	// Optional — features degrade gracefully without these
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
	ADMIN_EMAIL: z.string().email().optional(),
	UPSTASH_REDIS_REST_URL: z.string().optional(),
	UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
	SENTRY_DSN: z.string().optional(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),
	SENTRY_AUTH_TOKEN: z.string().optional(),
	CRON_SECRET: z.string().optional(),
	WHATSAPP_ACCESS_TOKEN: z.string().optional(),
	WHATSAPP_APP_SECRET: z.string().optional(),
	WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
	WHATSAPP_VERIFY_TOKEN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function validateEnv(): ServerEnv {
	const result = serverSchema.safeParse(process.env);

	if (!result.success) {
		const missing = result.error.issues
			.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
			.join("\n");

		console.error(
			`\n❌ Environment validation failed:\n${missing}\n\nCheck your .env.local file.\n`,
		);

		// In production, fail hard. In dev, warn but continue (some vars may be
		// loaded later by Next.js or only needed at request time).
		if (process.env.NODE_ENV === "production") {
			throw new Error(`Missing required environment variables:\n${missing}`);
		}
	}

	return (result.success ? result.data : process.env) as ServerEnv;
}

export const env = validateEnv();
