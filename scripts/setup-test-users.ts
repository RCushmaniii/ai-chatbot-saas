/**
 * Creates persistent test users in Clerk for Playwright E2E tests.
 * Run once to set up, then store credentials as env vars / GitHub secrets.
 *
 * Usage: npx tsx scripts/setup-test-users.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
	console.error("CLERK_SECRET_KEY not found in .env.local");
	process.exit(1);
}

const TEST_USERS = [
	{
		name: "ada",
		username: "ada_e2e_test",
		email: "ada-test@cushlabs.ai",
		password: "AdaTestPw2026!",
		firstName: "Ada",
		lastName: "Lovelace",
	},
	{
		name: "babbage",
		username: "babbage_e2e_test",
		email: "babbage-test@cushlabs.ai",
		password: "BabbageTestPw2026!",
		firstName: "Charles",
		lastName: "Babbage",
	},
	{
		name: "curie",
		username: "curie_e2e_test",
		email: "curie-test@cushlabs.ai",
		password: "CurieTestPw2026!",
		firstName: "Marie",
		lastName: "Curie",
	},
];

async function createUser(user: (typeof TEST_USERS)[number]) {
	// Check if user already exists
	const searchRes = await fetch(
		`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(user.email)}`,
		{
			headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
		},
	);
	const existing = await searchRes.json();

	if (Array.isArray(existing) && existing.length > 0) {
		console.log(`  ${user.name}: already exists (${existing[0].id})`);
		return existing[0].id;
	}

	const res = await fetch("https://api.clerk.com/v1/users", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${CLERK_SECRET_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			username: user.username,
			email_address: [user.email],
			password: user.password,
			first_name: user.firstName,
			last_name: user.lastName,
			skip_password_checks: true,
		}),
	});

	if (!res.ok) {
		const error = await res.text();
		console.error(`  ${user.name}: FAILED — ${error}`);
		return null;
	}

	const created = await res.json();
	console.log(`  ${user.name}: created (${created.id})`);
	return created.id;
}

async function main() {
	console.log("Setting up Clerk test users...\n");

	for (const user of TEST_USERS) {
		await createUser(user);
	}

	console.log("\n--- Environment variables for .env.local ---");
	console.log("E2E_CLERK_USER_USERNAME=ada-test@cushlabs.ai");
	console.log("E2E_CLERK_USER_PASSWORD=AdaTestPw2026!");
	console.log("\n--- GitHub Secrets to set ---");
	console.log("E2E_CLERK_USER_USERNAME=ada-test@cushlabs.ai");
	console.log("E2E_CLERK_USER_PASSWORD=AdaTestPw2026!");
}

main();
