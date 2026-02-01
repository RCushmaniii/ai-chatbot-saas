import { expect, test } from "../fixtures";

test.describe("Authentication", () => {
	test("Redirect unauthenticated users to /sign-in", async ({ page }) => {
		const response = await page.goto("/");

		if (!response) {
			throw new Error("Failed to load page");
		}

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

test.describe("Authenticated User Session", () => {
	test("Authenticated user can access chat", async ({ adaContext }) => {
		const response = await adaContext.page.goto("/");

		if (!response) {
			throw new Error("Failed to load page");
		}

		// Should stay on main page (not redirected to sign-in)
		await expect(adaContext.page).toHaveURL("/");

		// Should see chat input
		await expect(
			adaContext.page.getByPlaceholder("Send a message..."),
		).toBeVisible();
	});

	test("Authenticated user cannot access /login", async ({ adaContext }) => {
		await adaContext.page.goto("/login");
		// Authenticated users should be redirected away from login
		await expect(adaContext.page).toHaveURL("/");
	});

	test("Authenticated user cannot access /register", async ({ adaContext }) => {
		await adaContext.page.goto("/register");
		// Authenticated users should be redirected away from register
		await expect(adaContext.page).toHaveURL("/");
	});

	test("Display user email in user menu", async ({ adaContext }) => {
		await adaContext.page.goto("/");
		await expect(adaContext.page).toHaveURL("/");

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
		await adaContext.page.goto("/");

		const sidebarToggleButton = adaContext.page.getByTestId(
			"sidebar-toggle-button",
		);
		await sidebarToggleButton.click();

		const userNavButton = adaContext.page.getByTestId("user-nav-button");
		await expect(userNavButton).toBeVisible();

		await userNavButton.click();
		const userNavMenu = adaContext.page.getByTestId("user-nav-menu");
		await expect(userNavMenu).toBeVisible();

		const authMenuItem = adaContext.page.getByTestId("user-nav-item-auth");
		await expect(authMenuItem).toContainText("Sign out");
	});
});
