import { expect, test } from "../fixtures";

test.describe("/api/health", () => {
	test("Health endpoint returns 200", async ({ page }) => {
		const response = await page.request.get("/api/health");
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty("status", "ok");
	});
});
