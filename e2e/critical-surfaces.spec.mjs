import { expect, test } from "@playwright/test";

const authenticatedRoutes = [
  "/", "/entry", "/career", "/compare", "/deep-insights", "/history",
  "/journey", "/recap", "/letters", "/achievements", "/settings", "/assistant",
];

test.describe("anonymous and recovery boundaries", () => {
  test("auth surface loads without console failures", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    await page.goto("/");
    await expect(page.getByText(/sign in to track your earnings/i)).toBeVisible();
    await expect(page.locator("input[type=email]")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("reset password route remains reachable", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText(/password/i).first()).toBeVisible();
  });
});

test.describe("authenticated route contract", () => {
  test.skip(!process.env.STREEX_QA_EMAIL || !process.env.STREEX_QA_PASSWORD, "Dedicated QA credentials are required.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("input[type=email]").fill(process.env.STREEX_QA_EMAIL);
    await page.locator("input[type=password]").fill(process.env.STREEX_QA_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  for (const route of authenticatedRoutes) {
    test(`${route} renders without an uncaught page error`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(route);
      await expect(page.getByRole("navigation").first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/application error|unexpected error/i);
      expect(errors).toEqual([]);
    });
  }

  test("0.9.4 operational explorer and playbook are reachable", async ({ page }) => {
    await page.goto("/deep-insights");
    await expect(page.getByRole("heading", { name: "Deep Insights" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational Explorer" })).toBeVisible();
    await expect(page.getByRole("button", { name: /create driver playbook/i })).toBeVisible();
  });

  test("admin boundary fails closed for a non-admin QA account", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /admin ops|admin access unavailable/i })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
