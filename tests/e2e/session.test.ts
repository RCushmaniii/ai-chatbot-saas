import { expect, test } from "../fixtures";

test.describe("Authentication - Unauthenticated Users", () => {
	test("Unauthenticated users see landing page at /", async ({ page }) => {
		const response = await page.goto("/");

		if (!response) {
			throw new Error("Failed to load page");
		}

		// Unauthenticated users see the public landing page (not redirected)
		await expect(page).toHaveURL("/");
	});

	test("Redirect unauthenticated users to /sign-in from protected route", async ({
		page,
	}) => {
		await page.goto("/chat");

		// Clerk redirects unauthenticated users to /sign-in
		await expect(page).toHaveURL(/\/sign-in/);
	});

	test("Allow navigating to /login (redirects to /sign-in)", async ({
		page,
	}) => {
		await page.goto("/login");
		// /login page redirects to Clerk's /sign-in
		await expect(page).toHaveURL(/\/sign-in/);
	});

	test("Allow navigating to /register (redirects to /sign-up)", async ({
		page,
	}) => {
		await page.goto("/register");
		// /register page redirects to Clerk's /sign-up
		await expect(page).toHaveURL(/\/sign-up/);
	});
});

test.describe("Authentication - Authenticated Users", () => {
	test.beforeEach(async ({ requiresAuth }) => {
		// requiresAuth fixture skips tests if CLERK_SECRET_KEY is not set
	});

	test("Authenticated user can access chat", async ({ adaContext }) => {
		const response = await adaContext.page.goto("/");

		if (!response) {
			throw new Error("Failed to load page");
		}

		// Authenticated users are redirected from / to /chat
		await expect(adaContext.page).toHaveURL(/\/chat/);

		// Should see chat input
		await expect(
			adaContext.page.getByPlaceholder("Send a message..."),
		).toBeVisible();
	});

	test("Authenticated user cannot access /login", async ({ adaContext }) => {
		await adaContext.page.goto("/login");
		// Authenticated users should be redirected away from login to /chat
		await expect(adaContext.page).toHaveURL(/\/chat/);
	});

	test("Authenticated user cannot access /register", async ({ adaContext }) => {
		await adaContext.page.goto("/register");
		// Authenticated users should be redirected away from register to /chat
		await expect(adaContext.page).toHaveURL(/\/chat/);
	});

	test("Display user email in user menu", async ({ adaContext }) => {
		await adaContext.page.goto("/chat");
		await expect(adaContext.page).toHaveURL(/\/chat/);

		const sidebarToggleButton = adaContext.page.getByTestId(
			"sidebar-toggle-button",
		);
		await sidebarToggleButton.click();

		const userEmail = adaContext.page.getByTestId("user-email");
		await expect(userEmail).toBeVisible();
		// Should display actual email, not "Guest"
		await expect(userEmail).not.toContainText("Guest");
	});

	test("Sign out is available for authenticated users", async ({
		adaContext,
	}) => {
		await adaContext.page.goto("/chat");

		const sidebarToggleButton = adaContext.page.getByTestId(
			"sidebar-toggle-button",
		);
		await sidebarToggleButton.click();

		const userNavButton = adaContext.page.getByTestId("user-nav-button");
		await expect(userNavButton).toBeVisible();

		await userNavButton.scrollIntoViewIfNeeded();
		await userNavButton.click({ force: true });
		const userNavMenu = adaContext.page.getByTestId("user-nav-menu");
		await expect(userNavMenu).toBeVisible();

		const signOutItem = adaContext.page.getByTestId("user-nav-sign-out");
		await expect(signOutItem).toContainText("Sign out");
	});
});
