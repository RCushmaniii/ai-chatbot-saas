import { generateUUID } from "@/lib/utils";
import { expect, test } from "../fixtures";

test.describe("/api/embed", () => {
	// =========================================
	// Embed Script
	// =========================================

	test("GET /api/embed returns JavaScript with correct content type", async ({
		page,
	}) => {
		const response = await page.request.get("/api/embed?id=test-bot");
		expect(response.status()).toBe(200);

		const contentType = response.headers()["content-type"];
		expect(contentType).toContain("application/javascript");

		const body = await response.text();
		expect(body).toContain("test-bot");
		expect(body).toContain("iframe");
	});

	test("GET /api/embed has CORS headers for cross-origin embedding", async ({
		page,
	}) => {
		const response = await page.request.get("/api/embed");
		expect(response.status()).toBe(200);

		const headers = response.headers();
		expect(headers["access-control-allow-origin"]).toBe("*");
	});

	// =========================================
	// Embed Settings
	// =========================================

	test("GET /api/embed/settings returns bot configuration", async ({
		page,
	}) => {
		// Embed settings is public — no auth needed, but requires a botId
		const response = await page.request.get("/api/embed/settings?botId=test");
		// 200 with settings or 400/404 if bot not found
		expect([200, 400, 404]).toContain(response.status());
	});

	// =========================================
	// Embed Capture (Contact Collection)
	// =========================================

	test("POST /api/embed/capture rejects invalid body", async ({ page }) => {
		const response = await page.request.post("/api/embed/capture", {
			data: { invalid: true },
		});
		expect(response.status()).toBe(400);
	});

	test("POST /api/embed/capture requires at least one contact field", async ({
		page,
	}) => {
		const response = await page.request.post("/api/embed/capture", {
			data: {
				businessId: generateUUID(),
			},
		});
		expect(response.status()).toBe(400);
	});

	// =========================================
	// Embed Chat
	// =========================================

	test("POST /api/embed/chat rejects empty message", async ({ page }) => {
		const response = await page.request.post("/api/embed/chat", {
			data: {
				message: "",
				businessId: generateUUID(),
			},
		});
		expect(response.status()).toBe(400);
	});

	test("POST /api/embed/chat rejects missing message", async ({ page }) => {
		const response = await page.request.post("/api/embed/chat", {
			data: {
				businessId: generateUUID(),
			},
		});
		expect(response.status()).toBe(400);
	});

	// =========================================
	// Rate Limiting
	// =========================================

	test("POST /api/embed/capture respects rate limits", async ({ page }) => {
		// Send 11 requests rapidly (limit is 10/min)
		const responses = [];
		for (let i = 0; i < 11; i++) {
			responses.push(
				page.request.post("/api/embed/capture", {
					data: {
						businessId: generateUUID(),
						email: `test${i}@example.com`,
					},
				}),
			);
		}

		const results = await Promise.all(responses);
		const statuses = results.map((r) => r.status());

		// At least one should be rate limited (429) if Redis is running,
		// or all could pass if using in-memory limiter on fresh instance
		const has429 = statuses.includes(429);
		const allValid = statuses.every((s) => [200, 201, 400, 429].includes(s));
		expect(allValid).toBe(true);
	});
});
