import { expect, test } from "@playwright/test";

// CMS smoke tests. These require a running CMS, so they are skipped unless a
// safe target is provided via env — never production, and credentials are never
// committed:
//   CMS_E2E_URL       base URL of a dev/test CMS (e.g. https://cms-dev.georgedallas.com)
//   CMS_E2E_EMAIL     test admin email     (login test only)
//   CMS_E2E_PASSWORD  test admin password  (login test only)
//
// The deploy-dev workflow also smoke-tests CMS health on every deploy; this
// gives the same coverage inside the E2E suite when a target is configured.
const cmsUrl = process.env.CMS_E2E_URL;
const email = process.env.CMS_E2E_EMAIL;
const password = process.env.CMS_E2E_PASSWORD;

test.describe("CMS smoke", () => {
  test.skip(!cmsUrl, "Set CMS_E2E_URL to a dev/test CMS to run CMS smoke tests.");

  test("health endpoint responds OK", async ({ request }) => {
    const response = await request.get(`${cmsUrl}/api/health`, { timeout: 70_000 });
    expect(response.ok(), "CMS /api/health should return 2xx").toBeTruthy();
  });

  test("admin login reaches the dashboard", async ({ page }) => {
    test.skip(!email || !password, "Set CMS_E2E_EMAIL and CMS_E2E_PASSWORD to run the admin login test.");

    await page.goto(`${cmsUrl}/admin`, { timeout: 70_000 });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /log ?in|sign in/i }).click();
    await expect(page).toHaveURL(/\/admin(\/.*)?$/);
    await expect(page.getByRole("link", { name: /collections|dashboard|account/i }).first()).toBeVisible({
      timeout: 30_000
    });
  });
});
