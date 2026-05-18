import { expect, type Page, test } from "@playwright/test";

// Mocked embed-widget tests — pattern borrowed from ny-ai-chatbot.
//
// These tests run WITHOUT real OpenAI / Clerk / Postgres dependencies by
// intercepting every API call the widget makes via page.route() and returning
// deterministic fixtures. That makes them safe to run on Dependabot PRs and
// fork PRs which don't have access to repo secrets.
//
// Belongs to the `embed-mocked` Playwright project (no setup dependency).

const EMBED_URL = "/embed/chat";

async function mockSettings(
	page: Page,
	overrides: Record<string, unknown> = {},
) {
	await page.route("**/api/embed/settings**", (route) =>
		route.fulfill({ json: overrides }),
	);
}

async function mockChat(page: Page, responseText: string) {
	await page.route("**/api/embed/chat**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			json: { response: responseText },
		}),
	);
}

async function sendMessage(page: Page, text: string) {
	const input = page.getByPlaceholder(/type your message/i);
	await input.click();
	await input.fill(text);
	await page.getByRole("button", { name: /send/i }).click();
}

test.describe("Embed widget — cold open", () => {
	test("renders welcome screen with suggested questions on first load", async ({
		page,
	}) => {
		await mockSettings(page);
		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
		await expect(page.getByText("Quick questions:")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "What are the prices for classes?" }),
		).toBeVisible();
	});

	test("custom suggested questions from settings override defaults", async ({
		page,
	}) => {
		await mockSettings(page, {
			suggestedQuestions: ["Do you ship internationally?", "What is your ROI?"],
		});
		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await expect(
			page.getByRole("button", { name: "Do you ship internationally?" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "What is your ROI?" }),
		).toBeVisible();
		// Default question should NOT appear when overrides are provided
		await expect(
			page.getByRole("button", { name: "What are the prices for classes?" }),
		).not.toBeVisible();
	});
});

test.describe("Embed widget — chat flow", () => {
	test("clicking a suggested question pre-fills the input", async ({
		page,
	}) => {
		await mockSettings(page);
		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await page
			.getByRole("button", { name: "What services do you offer?" })
			.click();

		await expect(page.getByPlaceholder(/type your message/i)).toHaveValue(
			"What services do you offer?",
		);
	});

	test("submitting a message hides the welcome screen and renders the AI response", async ({
		page,
	}) => {
		await mockSettings(page);
		await mockChat(
			page,
			"We offer English tutoring, business writing, and TOEFL prep.",
		);
		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await sendMessage(page, "What services do you offer?");

		// Welcome screen disappears once a user message is sent
		await expect(
			page.getByRole("heading", { name: /welcome/i }),
		).not.toBeVisible();

		// Mocked AI response renders
		await expect(
			page.getByText(
				"We offer English tutoring, business writing, and TOEFL prep.",
			),
		).toBeVisible({ timeout: 5000 });
	});

	test("input clears after sending", async ({ page }) => {
		await mockSettings(page);
		await mockChat(page, "Got it!");
		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await sendMessage(page, "Hello");
		await expect(page.getByPlaceholder(/type your message/i)).toHaveValue("");
	});

	test("API error shows a graceful fallback message", async ({ page }) => {
		await mockSettings(page);
		await page.route("**/api/embed/chat**", (route) =>
			route.fulfill({ status: 500, json: { error: "boom" } }),
		);
		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await sendMessage(page, "Anything");

		await expect(page.getByText(/sorry, i encountered an error/i)).toBeVisible({
			timeout: 5000,
		});
	});
});

test.describe("Embed widget — settings", () => {
	test("custom placeholder from settings appears in input", async ({
		page,
	}) => {
		await mockSettings(page, { placeholder: "Ask anything…" });
		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await expect(page.getByPlaceholder("Ask anything…")).toBeVisible();
	});

	test("settings request failure falls back to defaults without crashing", async ({
		page,
	}) => {
		await page.route("**/api/embed/settings**", (route) =>
			route.fulfill({ status: 500, json: { error: "boom" } }),
		);
		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		// Default placeholder must still render even if settings fetch fails
		await expect(page.getByPlaceholder(/type your message/i)).toBeVisible();
	});
});
