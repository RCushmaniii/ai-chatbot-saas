import { expect, test } from "../fixtures";

test.describe
	.serial("/api/admin/settings", () => {
		test.beforeEach(async ({ requiresAuth }) => {
			// All route tests require authentication
		});

		// =========================================
		// Auth & RBAC
		// =========================================

		test("Unauthenticated request returns 401 or redirect", async ({
			page,
		}) => {
			const response = await page.request.get("/api/admin/settings");
			// Clerk middleware will either return 401 or redirect
			expect([401, 307, 302]).toContain(response.status());
		});

		// =========================================
		// CRUD Operations
		// =========================================

		test("Ada can save bot settings", async ({ adaContext }) => {
			const response = await adaContext.request.post("/api/admin/settings", {
				data: {
					botName: "Ada's Test Bot",
					customInstructions: "You are a helpful assistant for testing.",
				},
			});
			expect(response.status()).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
		});

		test("Ada can retrieve her bot settings", async ({ adaContext }) => {
			const response = await adaContext.request.get("/api/admin/settings");
			// 200 if settings exist, 404 if not yet created
			expect([200, 404]).toContain(response.status());

			if (response.status() === 200) {
				const body = await response.json();
				expect(body).toHaveProperty("botName");
			}
		});

		test("Ada can update specific fields without overwriting others", async ({
			adaContext,
		}) => {
			// First save full settings
			await adaContext.request.post("/api/admin/settings", {
				data: {
					botName: "Ada's Bot",
					customInstructions: "Be helpful.",
				},
			});

			// Update only botName
			const updateResponse = await adaContext.request.post(
				"/api/admin/settings",
				{
					data: {
						botName: "Ada's Updated Bot",
					},
				},
			);
			expect(updateResponse.status()).toBe(200);

			// Verify customInstructions wasn't wiped
			const getResponse = await adaContext.request.get("/api/admin/settings");
			if (getResponse.status() === 200) {
				const body = await getResponse.json();
				expect(body.botName).toBe("Ada's Updated Bot");
				expect(body.customInstructions).toBe("Be helpful.");
			}
		});

		// =========================================
		// Cross-Tenant Isolation
		// =========================================

		test("Babbage cannot see Ada's settings (separate business)", async ({
			babbageContext,
		}) => {
			// Babbage's GET returns HIS settings (or 404), never Ada's
			const response = await babbageContext.request.get("/api/admin/settings");
			expect([200, 404]).toContain(response.status());

			if (response.status() === 200) {
				const body = await response.json();
				// Should NOT be Ada's bot name
				expect(body.botName).not.toBe("Ada's Updated Bot");
			}
		});
	});
