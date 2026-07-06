import { expect, test } from "@playwright/test";

// Smoke tests for every public route, run against a production build seeded
// with the fixtures in fixtures.mjs.

test("homepage renders the hero, nav, and footer landmarks", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/George Dallas/);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
});

test("primary navigation links reach their pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Writing" }).click();
  await expect(page).toHaveURL(/\/writing\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Writing" })).toBeVisible();
});

test("writing index lists the published post", async ({ page }) => {
  await page.goto("/writing");
  await expect(page.getByRole("heading", { level: 1, name: "Writing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Test Post One" })).toBeVisible();
});

test("writing detail renders the post title and body", async ({ page }) => {
  await page.goto("/writing/test-post-one");
  await expect(page.getByRole("heading", { level: 1, name: "Test Post One" })).toBeVisible();
  await expect(page.getByText("This is the body of the seeded end-to-end test post.")).toBeVisible();
});

test("projects page lists the published project", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seed Project" })).toBeVisible();
});

test("links page lists a published link", async ({ page }) => {
  await page.goto("/links");
  await expect(page.getByRole("heading", { level: 1, name: "Links" })).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
});

test("now page renders the current focus", async ({ page }) => {
  await page.goto("/now");
  await expect(page.getByRole("heading", { level: 1, name: "Now" })).toBeVisible();
  await expect(page.getByText("Shipping the personal site")).toBeVisible();
});

test("contact page renders", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
});

test("homepage surfaces recent writing and the now snapshot", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Recent writing" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Test Post One" })).toBeVisible();
  await expect(page.getByText("Shipping the personal site")).toBeVisible();
});

test("colophon page renders from the footer link", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Colophon" }).click();
  await expect(page).toHaveURL(/\/colophon\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Colophon" })).toBeVisible();
});

test("unknown routes render the custom 404 page", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "This page isn't here." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the homepage" })).toBeVisible();
});

test("discoverability endpoints are generated", async ({ request }) => {
  for (const path of ["/robots.txt", "/sitemap.xml", "/rss.xml"]) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should return 2xx`).toBeTruthy();
  }
});
