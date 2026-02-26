import fs from "node:fs";
import path from "node:path";
import { clerk } from "@clerk/testing/playwright";
import type {
	APIRequestContext,
	Browser,
	BrowserContext,
	Page,
} from "@playwright/test";

export type UserContext = {
	context: BrowserContext;
	page: Page;
	request: APIRequestContext;
};

/**
 * Test user emails — must match users created via scripts/setup-test-users.ts.
 * Passwords are not needed: clerk.signIn({ emailAddress }) uses Backend API
 * sign-in tokens instead, which is more reliable for testing.
 */
const TEST_USERS: Record<string, string> = {
	ada: "ada-test@cushlabs.ai",
	babbage: "babbage-test@cushlabs.ai",
	curie: "curie-test@cushlabs.ai",
};

/**
 * Creates an authenticated browser context for Playwright tests.
 *
 * Uses @clerk/testing/playwright with the emailAddress flow which:
 * 1. Sets up the testing token route intercept (bypasses bot detection)
 * 2. Waits for Clerk JS to be fully loaded
 * 3. Creates a sign-in token via Clerk Backend API (requires CLERK_SECRET_KEY)
 * 4. Signs in with strategy "ticket" (no password needed)
 * 5. Waits for window.Clerk.user to be set (session fully established)
 *
 * This is more reliable than the signInParams/password flow because it
 * includes a built-in waitForFunction that ensures the session cookie
 * is set before returning.
 */
export async function createAuthenticatedContext({
	browser,
	name,
}: {
	browser: Browser;
	name: string;
}): Promise<UserContext> {
	const directory = path.join(__dirname, "../playwright/.sessions");

	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, { recursive: true });
	}

	// Extract the base user name (e.g., "ada" from "ada-0-1771894200")
	const baseName = name.split("-")[0];
	const email = TEST_USERS[baseName];
	const storageFile = path.join(directory, `${name}.json`);

	const context = await browser.newContext();
	const page = await context.newPage();

	if (!email) {
		console.warn(
			`No test email for "${baseName}". Creating unauthenticated context.`,
		);
		return { context, page, request: context.request };
	}

	try {
		console.log(`[auth] Navigating to "/" for "${baseName}"...`);

		// Navigate to a page that loads Clerk JS before signing in
		await page.goto("/", { waitUntil: "networkidle" });

		console.log(
			`[auth] Page loaded at ${page.url()}, signing in as "${baseName}" (${email})...`,
		);

		// Sign in using the emailAddress flow:
		// - Internally calls setupClerkTestingToken (route intercept for FAPI)
		// - Waits for window.Clerk to be loaded
		// - Creates a Backend API sign-in token (no password needed)
		// - Signs in with strategy "ticket"
		// - Waits for window.Clerk.user !== null (session fully established)
		await clerk.signIn({
			page,
			emailAddress: email,
		});

		console.log(`[auth] clerk.signIn() completed for "${baseName}"`);

		// Verify authentication by navigating to a protected route.
		// Use "domcontentloaded" instead of "networkidle" — the first /chat
		// load on CI can take 30s+ due to Turbopack compilation and Clerk
		// token refresh requests that keep the network busy.
		await page.goto("/chat", {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
		const finalUrl = page.url();

		if (finalUrl.includes("/sign-in") || finalUrl.includes("/sign-up")) {
			throw new Error(
				`Authentication verification failed for "${baseName}". ` +
					`Expected /chat but landed on ${finalUrl}. ` +
					"The sign-in completed but session was not established.",
			);
		}

		console.log(
			`[auth] Verified: "${baseName}" authenticated (landed on ${finalUrl})`,
		);

		// Save session state for potential reuse
		await context.storageState({ path: storageFile });
	} catch (error) {
		console.error(
			`[auth] Failed to authenticate "${baseName}" (${email}). ` +
				"Ensure test users exist in Clerk — run: pnpm test:setup\n",
			error,
		);
		throw error;
	}

	return { context, page, request: context.request };
}
