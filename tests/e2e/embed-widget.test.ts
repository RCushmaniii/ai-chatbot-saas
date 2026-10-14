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

/**
 * The loader fetches /api/embed/settings cross-origin from the host page, so
 * the mock must carry the CORS header the real route sends. Mocked even when
 * a test expects "nothing saved": a local run reads the production database,
 * where the CushLabs tenant HAS saved values.
 */
async function mockLoaderSettings(
	page: Page,
	body: Record<string, unknown> = {},
) {
	await page.route("**/api/embed/settings**", (route) =>
		route.fulfill({
			json: body,
			headers: { "Access-Control-Allow-Origin": "*" },
		}),
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
	/**
	 * A chip used to only copy its text into the input, leaving the visitor to
	 * press send as a second step. It now sends through the same path as the send
	 * button, so the request must carry the same logging fields.
	 */
	test("tapping a suggested question sends it immediately", async ({
		page,
	}) => {
		await mockSettings(page, { businessId: "biz-123", botId: "bot-456" });

		const bodies: Array<Record<string, unknown>> = [];
		await page.route("**/api/embed/chat**", async (route) => {
			bodies.push(route.request().postDataJSON());
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				json: { response: "About two weeks.", conversationId: "conv-1" },
			});
		});

		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		await page.getByRole("button", { name: "How can I contact you?" }).click();

		// The question appears as the visitor's message and the reply renders —
		// no send-button press involved.
		await expect(page.getByText("About two weeks.")).toBeVisible({
			timeout: 5000,
		});
		await expect(page.getByText("How can I contact you?")).toBeVisible();
		await expect(page.getByPlaceholder(/type your message/i)).toHaveValue("");
		// Focus lands on the conversation, not lost to <body>.
		await expect(page.getByRole("log")).toBeFocused();

		expect(bodies).toHaveLength(1);
		expect(bodies[0].message).toBe("How can I contact you?");
		expect(bodies[0].businessId).toBe("biz-123");
		expect(bodies[0].botId).toBe("bot-456");
		expect((bodies[0].visitorId as string).length).toBeGreaterThan(0);
		expect((bodies[0].sessionId as string).length).toBeGreaterThan(0);

		// The input still works for a follow-up typed message.
		await sendMessage(page, "And the price?");
		await expect.poll(() => bodies.length).toBe(2);
		expect(bodies[1].message).toBe("And the price?");
		expect(bodies[1].conversationId).toBe("conv-1");
	});

	test("double-tapping a suggested question sends it only once", async ({
		page,
	}) => {
		await mockSettings(page);

		let calls = 0;
		await page.route("**/api/embed/chat**", async (route) => {
			calls += 1;
			await new Promise((r) => setTimeout(r, 300));
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				json: { response: "Once." },
			});
		});

		await page.goto(EMBED_URL);
		await page.waitForLoadState("networkidle");

		// Both clicks in ONE task, before React re-renders. Playwright's dblclick
		// leaves enough gap for the chip to unmount between clicks, so it passes
		// even with no guard; this reproduces the actual race on a fast double-tap.
		await page
			.getByRole("button", { name: "How much does it cost?" })
			.evaluate((el: HTMLElement) => {
				el.click();
				el.click();
			});

		await expect(page.getByText("Once.")).toBeVisible({ timeout: 5000 });
		expect(calls).toBe(1);
		await expect(page.getByText("How much does it cost?")).toHaveCount(1);
	});

	test("Spanish chips send immediately too", async ({ page }) => {
		await mockSettings(page);
		const bodies: Array<Record<string, unknown>> = [];
		await page.route("**/api/embed/chat**", async (route) => {
			bodies.push(route.request().postDataJSON());
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				json: { response: "Depende del plan." },
			});
		});

		await page.goto(`${EMBED_URL}?language=es`);
		await page.waitForLoadState("networkidle");

		await page.getByRole("button", { name: "¿Cuánto cuesta?" }).click();

		await expect(page.getByText("Depende del plan.")).toBeVisible({
			timeout: 5000,
		});
		expect(bodies).toHaveLength(1);
		expect(bodies[0].message).toBe("¿Cuánto cuesta?");
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

/**
 * Attribute and stored values reach a CUSTOMER'S page through the loader
 * script (/api/embed), so they are treated as hostile. This loads the real
 * loader on a host page whose script tag carries attack values and checks
 * that none of them reach the DOM as anything but inert text.
 */
test.describe("Embed loader — hostile attribute values", () => {
	test("a CSS-injection color, a quote-breaking image URL and a bad position are refused", async ({
		page,
		baseURL,
	}) => {
		await mockLoaderSettings(page);
		await page.setContent(`<!doctype html><html><body>
			<script
				src="${baseURL}/api/embed?id=x';window.__pwned_id=1;//"
				buttonColor="red;background:url(https://evil.example/x)"
				welcomeGif="https://abc.public.blob.vercel-storage.com/a.png&quot; onerror=&quot;window.__pwned_img=1"
				welcomeMessage="<img src=x onerror=window.__pwned_text=1>"
				position="top:0;left:0"
				buttonSize="1);background:url(x"
			></script>
		</body></html>`);

		const button = page.locator("#nyenglish-chat-button");
		await expect(button).toBeVisible();

		const style = await button.evaluate((el) => {
			const cs = getComputedStyle(el);
			const inline = (el as HTMLElement).style;
			return {
				bg: cs.backgroundColor,
				bgImage: cs.backgroundImage,
				right: inline.right,
				transform: inline.transform,
			};
		});
		expect(style.bg).toBe("rgb(79, 70, 229)");
		expect(style.bgImage).toBe("none");
		expect(style.right).toBe("20px");
		expect(style.transform).toBe("scale(1)");

		// The message is shown as text and the image is dropped.
		const welcome = page.locator("#nyenglish-chat-welcome");
		await expect(welcome).toBeVisible();
		await expect(welcome.locator("img")).toHaveCount(0);
		await expect(welcome).toContainText("<img src=x onerror=");

		const pwned = await page.evaluate(() => {
			const w = window as unknown as Record<string, unknown>;
			return { id: w.__pwned_id, img: w.__pwned_img, text: w.__pwned_text };
		});
		expect(pwned).toEqual({ id: undefined, img: undefined, text: undefined });
	});

	test("valid values are honoured", async ({ page, baseURL }) => {
		await mockLoaderSettings(page);
		await page.setContent(`<!doctype html><html><body>
			<script src="${baseURL}/api/embed" buttonColor="#1c4992" position="bottom-left" showWelcomeMessage="false"></script>
		</body></html>`);
		const button = page.locator("#nyenglish-chat-button");
		await expect(button).toBeVisible();
		const style = await button.evaluate((el) => ({
			bg: getComputedStyle(el).backgroundColor,
			left: (el as HTMLElement).style.left,
		}));
		expect(style).toEqual({ bg: "rgb(28, 73, 146)", left: "20px" });
	});
});

/**
 * Lessons 1 and 2 of the 2026-10-14 audit: what the owner SAVED reaches the
 * visitor and wins over the script tag, and the tag still wins over built-in
 * defaults. Saved values are as hostile as attributes and are checked again.
 */
test.describe("Embed loader — saved settings", () => {
	test("saved color, position and welcome win over the tag's attributes", async ({
		page,
		baseURL,
	}) => {
		await mockLoaderSettings(page, {
			buttonColor: "#16a34a",
			position: "bottom-left",
			welcomeMessage: "Saved hello",
		});
		await page.setContent(`<!doctype html><html lang="en"><body>
			<script src="${baseURL}/api/embed" data-button-color="#1c4992" data-position="bottom-right" data-welcome-message="Attribute hello"></script>
		</body></html>`);
		const button = page.locator("#nyenglish-chat-button");
		await expect(button).toBeVisible();
		const style = await button.evaluate((el) => ({
			bg: getComputedStyle(el).backgroundColor,
			left: (el as HTMLElement).style.left,
		}));
		expect(style).toEqual({ bg: "rgb(22, 163, 74)", left: "20px" });
		await expect(page.locator("#nyenglish-chat-welcome")).toContainText(
			"Saved hello",
		);
	});

	test("hostile saved values are refused like hostile attributes", async ({
		page,
		baseURL,
	}) => {
		await mockLoaderSettings(page, {
			buttonColor: "red;background:url(x)",
			position: "top:0;left:0",
			welcomeMessage: "<img src=x onerror=window.__pwned_saved=1>",
		});
		await page.setContent(`<!doctype html><html lang="en"><body>
			<script src="${baseURL}/api/embed"></script>
		</body></html>`);
		const button = page.locator("#nyenglish-chat-button");
		await expect(button).toBeVisible();
		const style = await button.evaluate((el) => ({
			bg: getComputedStyle(el).backgroundColor,
			bgImage: getComputedStyle(el).backgroundImage,
			right: (el as HTMLElement).style.right,
		}));
		expect(style).toEqual({
			bg: "rgb(79, 70, 229)",
			bgImage: "none",
			right: "20px",
		});
		const welcome = page.locator("#nyenglish-chat-welcome");
		await expect(welcome.locator("img")).toHaveCount(0);
		await expect(welcome).toContainText("<img src=x onerror=");
		expect(
			await page.evaluate(
				() => (window as unknown as Record<string, unknown>).__pwned_saved,
			),
		).toBeUndefined();
	});

	test("a settings outage still draws the widget from its fallbacks", async ({
		page,
		baseURL,
	}) => {
		await page.route("**/api/embed/settings**", (route) => route.abort());
		await page.setContent(`<!doctype html><html lang="en"><body>
			<script src="${baseURL}/api/embed" data-button-color="#1c4992"></script>
		</body></html>`);
		const button = page.locator("#nyenglish-chat-button");
		await expect(button).toBeVisible();
		expect(
			await button.evaluate((el) => getComputedStyle(el).backgroundColor),
		).toBe("rgb(28, 73, 146)");
	});
});

/**
 * Lesson 9: the language comes from data-language, then language, then the
 * page's <html lang>, and switching the page's language reloads the chat in
 * that language. Lesson 3: a Spanish page never shows English text.
 */
test.describe("Embed loader — language", () => {
	test("follows <html lang> and reloads when the page switches language", async ({
		page,
		baseURL,
	}) => {
		const asked: string[] = [];
		await page.route("**/api/embed/settings**", (route) => {
			const lang = new URL(route.request().url()).searchParams.get("language");
			asked.push(lang ?? "");
			return route.fulfill({
				json: lang === "es" ? {} : { welcomeMessage: "English only hello" },
				headers: { "Access-Control-Allow-Origin": "*" },
			});
		});
		await page.setContent(`<!doctype html><html lang="es-MX"><body>
			<script src="${baseURL}/api/embed" data-welcome-message="Attribute hello"></script>
		</body></html>`);
		const iframe = page.locator("#nyenglish-chat-iframe");
		await expect(iframe).toHaveAttribute("src", /language=es/);
		// Spanish page, nothing saved in Spanish: the built-in Spanish note, never
		// the English saved text or the language-less attribute.
		const welcome = page.locator("#nyenglish-chat-welcome");
		await expect(welcome).toContainText("¡Hola! Pregúntame lo que quieras.");
		await expect(page.locator("#nyenglish-chat-button")).toHaveAttribute(
			"aria-label",
			"Abrir chat",
		);

		await page.evaluate(() =>
			document.documentElement.setAttribute("lang", "en"),
		);
		await expect(iframe).toHaveAttribute("src", /language=en/);
		await expect(welcome).toContainText("English only hello");
		// The iframe fetches settings too, so only the order of the first two
		// languages asked for is checked: Spanish first, English after the switch.
		expect(asked[0]).toBe("es");
		expect(asked).toContain("en");
	});

	test("data-language beats the page's lang", async ({ page, baseURL }) => {
		await mockLoaderSettings(page);
		await page.setContent(`<!doctype html><html lang="en"><body>
			<script src="${baseURL}/api/embed" data-language="es"></script>
		</body></html>`);
		await expect(page.locator("#nyenglish-chat-iframe")).toHaveAttribute(
			"src",
			/language=es/,
		);
	});
});

/**
 * The chat window renders the saved appearance and the saved welcome for its
 * language, and drops hostile appearance values.
 */
test.describe("Embed widget — appearance and welcome", () => {
	test("saved header color, readable title and the Spanish welcome", async ({
		page,
	}) => {
		await mockSettings(page, {
			botName: "Prueba",
			welcomeMessage: "Hola desde el admin",
			appearance: {
				headerColor: "#1c4992",
				avatarBackground: "#ffffff",
				avatarRing: "#FF6A3D",
				avatarUrl: null,
			},
		});
		await page.goto(`${EMBED_URL}?language=es`);
		await expect(page.getByText("Hola desde el admin")).toBeVisible();
		const title = page.getByRole("heading", { name: "Prueba" });
		await expect(title).toBeVisible();
		// Dark header, so the title switches to white on its own.
		expect(await title.evaluate((el) => getComputedStyle(el).color)).toBe(
			"rgb(255, 255, 255)",
		);
		await expect(
			page.getByRole("button", { name: "Cerrar chat" }),
		).toBeVisible();
		await expect(page.getByPlaceholder("Escribe un mensaje...")).toBeVisible();
	});

	test("hostile appearance values fall back to the standard look", async ({
		page,
	}) => {
		await mockSettings(page, {
			appearance: {
				headerColor: "red;background:url(x)",
				avatarBackground: "url(javascript:alert(1))",
				avatarUrl:
					'https://abc.public.blob.vercel-storage.com/a.png" onerror="window.__pwned_av=1',
			},
		});
		await page.goto(EMBED_URL);
		await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
		const header = page.getByRole("heading", { name: "AI Assistant" });
		const bg = await header.evaluate(
			(el) =>
				getComputedStyle(el.parentElement?.parentElement as Element)
					.backgroundColor,
		);
		expect(bg).toBe("rgb(255, 255, 255)");
		await expect(page.locator("img")).toHaveCount(0);
		expect(
			await page.evaluate(
				() => (window as unknown as Record<string, unknown>).__pwned_av,
			),
		).toBeUndefined();
	});
});

test.describe("Embed loader — welcome note timing", () => {
	test("the note never fades in over a chat the visitor already opened", async ({
		page,
		baseURL,
	}) => {
		await mockLoaderSettings(page, { welcomeMessage: "Saved hello" });
		await page.setContent(`<!doctype html><html lang="en"><body>
			<script src="${baseURL}/api/embed"></script>
		</body></html>`);
		await page.locator("#nyenglish-chat-button").click();
		await page.waitForTimeout(1500);
		await expect(page.locator("#nyenglish-chat-welcome")).toBeHidden();
	});
});
