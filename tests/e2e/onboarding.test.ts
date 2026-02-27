import { config } from "dotenv";
import postgres from "postgres";
import { expect, test } from "../fixtures";

config({ path: ".env.local" });

const sql = postgres(process.env.POSTGRES_URL!);

/**
 * Helper: set a user's business onboarding status directly in DB.
 * The complete API only accepts 'completed'|'skipped', so we need DB access
 * to reset to 'pending' for testing the wizard flow.
 */
async function setOnboardingStatus(
	email: string,
	status: string,
	step: number,
) {
	await sql`
		UPDATE "Business" SET onboarding_status = ${status}, onboarding_step = ${step}
		WHERE id IN (
			SELECT m."businessId" FROM "Membership" m
			JOIN "User" u ON u.id = m."userId"
			WHERE u.email = ${email}
		)
	`;
}

test.describe("Onboarding wizard", () => {
	test.describe.configure({ mode: "serial" });

	// =========================================
	// API Route Tests
	// =========================================

	test("API: progress route saves step", async ({
		adaContext,
		requiresAuth,
	}) => {
		const response = await adaContext.request.post(
			"/api/onboarding/progress",
			{ data: { step: 2 } },
		);
		expect(response.status()).toBe(200);
		expect((await response.json()).success).toBe(true);
	});

	test("API: progress route saves business and bot names", async ({
		adaContext,
		requiresAuth,
	}) => {
		const response = await adaContext.request.post(
			"/api/onboarding/progress",
			{
				data: {
					step: 2,
					businessName: "Ada's Test Business",
					botName: "Ada Bot",
				},
			},
		);
		expect(response.status()).toBe(200);
		expect((await response.json()).success).toBe(true);
	});

	test("API: progress route rejects invalid step", async ({
		adaContext,
		requiresAuth,
	}) => {
		const response = await adaContext.request.post(
			"/api/onboarding/progress",
			{ data: { step: 99 } },
		);
		expect(response.status()).toBe(400);
	});

	test("API: complete route accepts 'completed'", async ({
		adaContext,
		requiresAuth,
	}) => {
		const response = await adaContext.request.post(
			"/api/onboarding/complete",
			{ data: { status: "completed" } },
		);
		expect(response.status()).toBe(200);
		expect((await response.json()).success).toBe(true);
	});

	test("API: complete route accepts 'skipped'", async ({
		adaContext,
		requiresAuth,
	}) => {
		const response = await adaContext.request.post(
			"/api/onboarding/complete",
			{ data: { status: "skipped" } },
		);
		expect(response.status()).toBe(200);
		// Restore to completed for subsequent tests
		await adaContext.request.post("/api/onboarding/complete", {
			data: { status: "completed" },
		});
	});

	test("API: complete route rejects invalid status", async ({
		adaContext,
		requiresAuth,
	}) => {
		const response = await adaContext.request.post(
			"/api/onboarding/complete",
			{ data: { status: "invalid" } },
		);
		expect(response.status()).toBe(400);
	});

	// =========================================
	// Redirect Tests (completed user)
	// =========================================

	test("Completed user stays on /chat, not redirected", async ({
		adaContext,
		requiresAuth,
	}) => {
		await adaContext.page.goto("/chat", { waitUntil: "domcontentloaded" });
		expect(adaContext.page.url()).not.toContain("/onboarding");
	});

	test("Completed user visiting /onboarding is redirected to /chat", async ({
		adaContext,
		requiresAuth,
	}) => {
		await adaContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});
		await adaContext.page.waitForURL("**/chat**", { timeout: 10000 });
		expect(adaContext.page.url()).toContain("/chat");
	});

	// =========================================
	// Full Wizard Flow (pending user)
	// =========================================

	test("Pending user is redirected to /onboarding", async ({
		babbageContext,
		requiresAuth,
	}) => {
		// Set Babbage to pending onboarding via DB
		await setOnboardingStatus("babbage-test@cushlabs.ai", "pending", 1);

		await babbageContext.page.goto("/", { waitUntil: "domcontentloaded" });
		await babbageContext.page.waitForURL("**/onboarding**", {
			timeout: 15000,
		});
		expect(babbageContext.page.url()).toContain("/onboarding");
	});

	test("Wizard renders step 1 (Welcome)", async ({
		babbageContext,
		requiresAuth,
	}) => {
		// Should already be on /onboarding from previous test
		await babbageContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});

		// Step 1: welcome card with business name and bot name inputs
		await expect(
			babbageContext.page.locator('input[id="businessName"]'),
		).toBeVisible({ timeout: 10000 });
		await expect(
			babbageContext.page.locator('input[id="botName"]'),
		).toBeVisible();
	});

	test("Step 1: fill business name and bot name, go to step 2", async ({
		babbageContext,
		requiresAuth,
	}) => {
		await babbageContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});

		// Fill in business details
		const businessInput = babbageContext.page.locator(
			'input[id="businessName"]',
		);
		await businessInput.waitFor({ state: "visible", timeout: 10000 });
		await businessInput.clear();
		await businessInput.fill("Babbage Test Co");

		const botInput = babbageContext.page.locator('input[id="botName"]');
		await botInput.clear();
		await botInput.fill("Babbage Bot");

		// Click Next (use exact match to avoid matching Next.js Dev Tools button)
		await babbageContext.page.getByRole("button", { name: /^(Next|Siguiente)$/ }).click();

		// Should now be on step 2 — knowledge options should appear
		await expect(
			babbageContext.page.getByText(/train your chatbot|entrena tu chatbot/i),
		).toBeVisible({ timeout: 10000 });
	});

	test("Step 2: knowledge options are shown", async ({
		babbageContext,
		requiresAuth,
	}) => {
		// Babbage should now be on step 2 (saved in DB from previous test)
		await babbageContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});

		// Three knowledge source options should be visible
		await expect(
			babbageContext.page.getByText(
				/import from website|importar desde sitio web/i,
			),
		).toBeVisible({ timeout: 10000 });
		await expect(
			babbageContext.page.getByText(/upload a pdf|subir un pdf/i),
		).toBeVisible();
		await expect(
			babbageContext.page.getByText(/paste text|pegar texto/i),
		).toBeVisible();
	});

	test("Step 2: skip to step 3 (test chat)", async ({
		babbageContext,
		requiresAuth,
	}) => {
		await babbageContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});

		// Wait for step 2 content
		await expect(
			babbageContext.page.getByText(
				/import from website|importar desde sitio web/i,
			),
		).toBeVisible({ timeout: 10000 });

		// Click the skip knowledge button
		await babbageContext.page
			.getByRole("button", { name: /skip.*knowledge|omitir.*conocimiento/i })
			.click();

		// Should now be on step 3 — chat preview
		await expect(
			babbageContext.page.getByText(
				/test your chatbot|prueba tu chatbot/i,
			),
		).toBeVisible({ timeout: 10000 });
	});

	test("Step 3: chat preview iframe is rendered", async ({
		babbageContext,
		requiresAuth,
	}) => {
		await babbageContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});

		// Check step 3 is shown (wizard resumes at step 3)
		await expect(
			babbageContext.page.getByText(
				/test your chatbot|prueba tu chatbot/i,
			),
		).toBeVisible({ timeout: 10000 });

		// Chat preview iframe should exist
		const iframe = babbageContext.page.locator('iframe[title="Chat Preview"]');
		await expect(iframe).toBeVisible();

		// Click Next to go to step 4
		await babbageContext.page.getByRole("button", { name: /^(Next|Siguiente)$/ }).click();

		// Step 4 — embed code
		await expect(
			babbageContext.page.getByText(
				/install on your website|instala en tu sitio web/i,
			),
		).toBeVisible({ timeout: 10000 });
	});

	test("Step 4: embed code is displayed with copy button", async ({
		babbageContext,
		requiresAuth,
	}) => {
		await babbageContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});

		// Step 4 should show embed code
		await expect(
			babbageContext.page.getByText(
				/install on your website|instala en tu sitio web/i,
			),
		).toBeVisible({ timeout: 10000 });

		// Embed code block should be visible
		await expect(babbageContext.page.locator("pre code")).toBeVisible();

		// Copy button should exist
		await expect(
			babbageContext.page.getByRole("button", {
				name: /copy|copiar/i,
			}),
		).toBeVisible();

		// Color input should exist
		await expect(
			babbageContext.page.locator('input[id="embedColor"]'),
		).toBeVisible();
	});

	test("Step 4: finish onboarding redirects to /admin", async ({
		babbageContext,
		requiresAuth,
	}) => {
		await babbageContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});

		// Wait for step 4
		await expect(
			babbageContext.page.getByText(
				/install on your website|instala en tu sitio web/i,
			),
		).toBeVisible({ timeout: 10000 });

		// Click "Go to Dashboard" / "Ir al Panel"
		await babbageContext.page
			.getByRole("button", { name: /go to dashboard|ir al panel/i })
			.click();

		// Should redirect away from onboarding
		await babbageContext.page.waitForURL(
			(url) => !url.pathname.includes("/onboarding"),
			{ timeout: 15000 },
		);
		// URL should be /admin or /chat (admin may redirect to chat if no admin page)
		const finalUrl = babbageContext.page.url();
		expect(
			finalUrl.includes("/admin") || finalUrl.includes("/chat"),
		).toBeTruthy();
	});

	test("After completing, /onboarding redirects to /chat", async ({
		babbageContext,
		requiresAuth,
	}) => {
		// Babbage just completed onboarding, going to /onboarding should redirect
		await babbageContext.page.goto("/onboarding", {
			waitUntil: "domcontentloaded",
		});
		await babbageContext.page.waitForURL("**/chat**", { timeout: 10000 });
		expect(babbageContext.page.url()).toContain("/chat");
	});

	// =========================================
	// Cleanup
	// =========================================

	test("Cleanup: restore test users", async () => {
		await setOnboardingStatus(
			"babbage-test@cushlabs.ai",
			"completed",
			1,
		);
		await setOnboardingStatus("ada-test@cushlabs.ai", "completed", 1);
	});
});
