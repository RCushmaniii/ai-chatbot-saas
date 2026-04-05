import { expect, test } from "../fixtures";

let adaContactId: string | null = null;

test.describe
	.serial("/api/admin/contacts", () => {
		test.beforeEach(async ({ requiresAuth }) => {
			// All route tests require authentication
		});

		// =========================================
		// Auth
		// =========================================

		test("Unauthenticated request returns 401 or redirect", async ({
			page,
		}) => {
			const response = await page.request.get("/api/admin/contacts");
			expect([401, 307, 302]).toContain(response.status());
		});

		// =========================================
		// Create
		// =========================================

		test("Ada can create a contact with email", async ({ adaContext }) => {
			const response = await adaContext.request.post("/api/admin/contacts", {
				data: {
					email: "test-contact@example.com",
					name: "Test Contact",
					status: "new",
				},
			});
			expect(response.status()).toBe(201);

			const body = await response.json();
			expect(body).toHaveProperty("id");
			expect(body.email).toBe("test-contact@example.com");
			expect(body.name).toBe("Test Contact");
			adaContactId = body.id;
		});

		test("Ada can create a contact with phone only", async ({
			adaContext,
		}) => {
			const response = await adaContext.request.post("/api/admin/contacts", {
				data: {
					phone: "+1234567890",
					name: "Phone Contact",
				},
			});
			expect(response.status()).toBe(201);
		});

		test("Create contact with invalid email returns 400", async ({
			adaContext,
		}) => {
			const response = await adaContext.request.post("/api/admin/contacts", {
				data: {
					email: "not-an-email",
					name: "Invalid",
				},
			});
			expect(response.status()).toBe(400);
		});

		// =========================================
		// Read
		// =========================================

		test("Ada can list her contacts", async ({ adaContext }) => {
			const response = await adaContext.request.get("/api/admin/contacts");
			expect(response.status()).toBe(200);

			const body = await response.json();
			expect(body).toHaveProperty("contacts");
			expect(Array.isArray(body.contacts)).toBe(true);
			expect(body.contacts.length).toBeGreaterThanOrEqual(1);
		});

		test("Ada can search contacts by name", async ({ adaContext }) => {
			const response = await adaContext.request.get(
				"/api/admin/contacts?search=Test+Contact",
			);
			expect(response.status()).toBe(200);

			const body = await response.json();
			expect(body.contacts.length).toBeGreaterThanOrEqual(1);
		});

		test("Ada can filter contacts by status", async ({ adaContext }) => {
			const response = await adaContext.request.get(
				"/api/admin/contacts?status=new",
			);
			expect(response.status()).toBe(200);

			const body = await response.json();
			for (const contact of body.contacts) {
				expect(contact.status).toBe("new");
			}
		});

		test("Ada can paginate contacts", async ({ adaContext }) => {
			const response = await adaContext.request.get(
				"/api/admin/contacts?limit=1&offset=0",
			);
			expect(response.status()).toBe(200);

			const body = await response.json();
			expect(body.contacts.length).toBeLessThanOrEqual(1);
		});

		// =========================================
		// Cross-Tenant Isolation
		// =========================================

		test("Babbage cannot see Ada's contacts", async ({
			babbageContext,
		}) => {
			const response = await babbageContext.request.get("/api/admin/contacts");
			expect(response.status()).toBe(200);

			const body = await response.json();
			// Babbage should not see contacts with ada's test email
			const adaContacts = body.contacts.filter(
				(c: { email: string }) => c.email === "test-contact@example.com",
			);
			expect(adaContacts.length).toBe(0);
		});

		// =========================================
		// Cleanup
		// =========================================

		test("Cleanup: delete test contacts", async ({ adaContext }) => {
			if (adaContactId) {
				const response = await adaContext.request.delete(
					`/api/admin/contacts?id=${adaContactId}`,
				);
				// 200 or 405 if DELETE not supported on this route
				expect([200, 204, 405]).toContain(response.status());
			}
		});
	});
