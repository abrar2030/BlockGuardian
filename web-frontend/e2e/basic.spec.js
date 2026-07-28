const { test, expect } = require("@playwright/test");

// These specs exercise the real UI against a running backend (see README.md
// for how to seed and start one). Run with `npm run test:e2e`.

test.describe("Public pages", () => {
  test("home page loads with hero and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/BlockGuardian/i);
    await expect(
      page.getByRole("heading", { name: /Guard and grow your/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create free account/i }),
    ).toBeVisible();
  });

  test("navbar links to login and register", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByRole("link", { name: /Create one for free/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("about, contact, privacy, and terms pages render", async ({ page }) => {
    for (const [path, heading] of [
      ["/about", /About/i],
      ["/contact", /Get in touch/i],
      ["/privacy", /Privacy Policy/i],
      ["/terms", /Terms of Service/i],
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: heading }).first(),
      ).toBeVisible();
    }
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[aria-label="Toggle dark mode"]').click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("unknown route shows 404 page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
  });
});

test.describe("Authentication", () => {
  test("login page renders form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /Welcome back/i }),
    ).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("login shows an error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "nobody@example.com");
    await page.fill("#password", "WrongPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test("register page enforces required fields", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });

  test("visiting a protected page while signed out redirects to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
