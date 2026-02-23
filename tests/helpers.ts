import fs from "node:fs";
import path from "node:path";
import type {
	APIRequestContext,
	Browser,
	BrowserContext,
	Page,
} from "@playwright/test";
import { getUnixTime } from "date-fns";

export type UserContext = {
	context: BrowserContext;
	page: Page;
	request: APIRequestContext;
};

/**
 * Creates an authenticated browser context for Playwright tests.
 *
 * For Clerk authentication, this requires either:
 * 1. CLERK_TESTING_TOKEN env var set (from Clerk Dashboard > Testing)
 * 2. Pre-existing session cookies from a logged-in user
 *
 * If no testing token is available, tests requiring authentication will be skipped.
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

	const storageFile = path.join(directory, `${name}.json`);

	// Check if we have a saved session
	if (fs.existsSync(storageFile)) {
		const context = await browser.newContext({ storageState: storageFile });
		const page = await context.newPage();
		return {
			context,
			page,
			request: context.request,
		};
	}

	// Check for Clerk testing token
	const testingToken = process.env.CLERK_TESTING_TOKEN;

	if (testingToken) {
		// Use Clerk testing token for authentication
		const context = await browser.newContext();
		const page = await context.newPage();

		// Set the Clerk testing token cookie
		await context.addCookies([
			{
				name: "__clerk_db_jwt",
				value: testingToken,
				domain: "localhost",
				path: "/",
			},
		]);

		await context.storageState({ path: storageFile });

		return {
			context,
			page,
			request: context.request,
		};
	}

	// No auth available - create unauthenticated context
	// Tests using this will need to handle the redirect to /sign-in
	console.warn(
		`No CLERK_TESTING_TOKEN found. Creating unauthenticated context for ${name}.`,
	);
	console.warn(
		"To enable authenticated tests, set CLERK_TESTING_TOKEN from Clerk Dashboard > Testing.",
	);

	const context = await browser.newContext();
	const page = await context.newPage();

	return {
		context,
		page,
		request: context.request,
	};
}

export function generateRandomTestUser() {
	const email = `test-${getUnixTime(new Date())}@playwright.com`;
	const password = `Test${getUnixTime(new Date())}!`;

	return {
		email,
		password,
	};
}
