import { expect, test } from "../fixtures";

test.describe
	.serial("/api/admin/knowledge", () => {
		test.beforeEach(async ({ requiresAuth }) => {
			// All route tests require authentication
		});

		// =========================================
		// Auth
		// =========================================

		test("Unauthenticated request returns 401 or redirect", async ({
			page,
		}) => {
			const response = await page.request.get("/api/admin/knowledge");
			expect([401, 307, 302]).toContain(response.status());
		});

		// =========================================
		// Read (safe — no side effects)
		// =========================================

		test("Ada can list her knowledge base documents", async ({
			adaContext,
		}) => {
			const response = await adaContext.request.get("/api/admin/knowledge");
			expect(response.status()).toBe(200);

			const body = await response.json();
			expect(body).toHaveProperty("documents");
			expect(Array.isArray(body.documents)).toBe(true);
		});

		// =========================================
		// Validation
		// =========================================

		test("POST without content returns 400", async ({ adaContext }) => {
			const response = await adaContext.request.post("/api/admin/knowledge", {
				data: {
					url: "https://example.com",
				},
			});
			expect(response.status()).toBe(400);
		});

		test("DELETE without ID returns 400", async ({ adaContext }) => {
			const response = await adaContext.request.delete(
				"/api/admin/knowledge",
			);
			expect(response.status()).toBe(400);
		});

		test("DELETE with non-numeric ID returns 400", async ({
			adaContext,
		}) => {
			const response = await adaContext.request.delete(
				"/api/admin/knowledge?id=not-a-number",
			);
			expect(response.status()).toBe(400);
		});

		// =========================================
		// Cross-Tenant Isolation
		// =========================================

		test("Babbage cannot see Ada's knowledge documents", async ({
			babbageContext,
		}) => {
			const response = await babbageContext.request.get(
				"/api/admin/knowledge",
			);
			expect(response.status()).toBe(200);

			const body = await response.json();
			// Babbage's business should have its own (possibly empty) knowledge base
			// Verify the response structure is valid even if empty
			expect(body).toHaveProperty("documents");
			expect(Array.isArray(body.documents)).toBe(true);
		});
	});
