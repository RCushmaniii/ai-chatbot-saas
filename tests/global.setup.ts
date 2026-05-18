import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

setup("global setup", async () => {
	// Dependabot PRs and fork PRs don't have CLERK_SECRET_KEY available. Skip
	// clerk setup gracefully — the auth-dependent test projects will then be
	// skipped at runtime, while the mocked embed-widget project still runs.
	if (!process.env.CLERK_SECRET_KEY) {
		setup.skip(
			true,
			"CLERK_SECRET_KEY not set (Dependabot/fork PR) — skipping auth-dependent setup",
		);
		return;
	}

	// If CLERK_TESTING_TOKEN is already set (e.g. by CI workflow), skip generation.
	// clerkSetup() will still configure the internal state for @clerk/testing.
	await clerkSetup();
});
