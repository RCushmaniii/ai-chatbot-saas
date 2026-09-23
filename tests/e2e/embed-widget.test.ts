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
			page.getByRole("button", { name: "How much does it cost?" }),
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
			page.getByRole("button", { name: "How much does it cost?" }),
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

		await page.getByRole("button", { name: "How long does it take?" }).click();

		await expect(page.getByPlaceholder(/type your message/i)).toHaveValue(
			"How long does it take?",
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

		await sendMessage(page, "How long does it take?");

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

/**
 * The conversation-logging contract.
 *
 * The widget shipped for months POSTing a body of exactly { chatId, message }.
 * The chat route only records a conversation when businessId, visitorId and
 * sessionId are all present, so WidgetConversation, WidgetMessage and Contact
 * stayed empty for every tenant while the widget was live on 126 pages. The
 * replies were correct the whole time, because the answer path falls back to
 * DEFAULT_BUSINESS_ID — which is exactly why no test and no human caught it.
 *
 * These assertions are on the REQUEST, not the reply, because the reply was
 * never the thing that broke.
 */
test.describe("Embed widget — conversation logging contract", () => {
	test("sends businessId, visitorId and sessionId with every message", async ({
		page,
	}) => {
		await mockSettings(page, { businessId: "biz-123", botId: "bot-456" });

		const bodies: Array<Record<string, unknown>> = [];
		await page.route("**/api/embed/chat**", async (route) => {
			bodies.push(route.request().postDataJSON());
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				json: { response: "ok", conversationId: "conv-789" },
			});
		});

		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await sendMessage(page, "first message");
		await expect(page.getByText("ok")).toBeVisible();

		expect(bodies).toHaveLength(1);
		const first = bodies[0];
		expect(first.message).toBe("first message");
		expect(first.businessId).toBe("biz-123");
		expect(first.botId).toBe("bot-456");
		expect(typeof first.visitorId).toBe("string");
		expect((first.visitorId as string).length).toBeGreaterThan(0);
		expect(typeof first.sessionId).toBe("string");
		expect((first.sessionId as string).length).toBeGreaterThan(0);
	});

	test("carries the server-assigned conversationId into the next message", async ({
		page,
	}) => {
		await mockSettings(page, { businessId: "biz-123", botId: "bot-456" });

		const bodies: Array<Record<string, unknown>> = [];
		await page.route("**/api/embed/chat**", async (route) => {
			bodies.push(route.request().postDataJSON());
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				json: { response: "ok", conversationId: "conv-789" },
			});
		});

		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await sendMessage(page, "one");
		await expect(page.getByText("ok").first()).toBeVisible();
		await sendMessage(page, "two");
		await expect(page.getByText("ok").nth(1)).toBeVisible();

		expect(bodies).toHaveLength(2);
		// First turn has no conversation yet; the second must reuse what the
		// server assigned, or every turn opens its own orphan conversation.
		expect(bodies[0].conversationId).toBeUndefined();
		expect(bodies[1].conversationId).toBe("conv-789");
		// Same visitor and session across turns in one page load.
		expect(bodies[1].visitorId).toBe(bodies[0].visitorId);
		expect(bodies[1].sessionId).toBe(bodies[0].sessionId);
	});

	test("still records when localStorage is unavailable", async ({ page }) => {
		await mockSettings(page, { businessId: "biz-123", botId: "bot-456" });

		// A cross-origin iframe with third-party storage blocked, or a private
		// window, throws on access. The widget must degrade to a per-load visitor
		// id rather than crash or send nothing.
		await page.addInitScript(() => {
			Object.defineProperty(window, "localStorage", {
				get() {
					throw new Error("localStorage is not available");
				},
			});
		});

		const bodies: Array<Record<string, unknown>> = [];
		await page.route("**/api/embed/chat**", async (route) => {
			bodies.push(route.request().postDataJSON());
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				json: { response: "ok" },
			});
		});

		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await sendMessage(page, "hello");
		await expect(page.getByText("ok")).toBeVisible();

		expect(bodies).toHaveLength(1);
		expect(typeof bodies[0].visitorId).toBe("string");
		expect((bodies[0].visitorId as string).length).toBeGreaterThan(0);
	});
});
