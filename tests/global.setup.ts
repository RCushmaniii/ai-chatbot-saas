import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

setup("global setup", async () => {
	// If CLERK_TESTING_TOKEN is already set (e.g. by CI workflow), skip generation.
	// clerkSetup() will still configure the internal state for @clerk/testing.
	await clerkSetup();
});
