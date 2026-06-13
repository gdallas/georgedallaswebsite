import { expect, test } from "@playwright/test";

// End-to-end proof that draft, private, and future-scheduled content never
// reaches the built public site, even though the mock CMS returns it. This
// complements the unit-level visibility tests (packages/shared, lib/cms.test.mjs)
// by checking the actually-rendered output.

test("writing index hides draft, private, and future posts", async ({ page }) => {
  await page.goto("/writing");
  await expect(page.getByRole("link", { name: "Test Post One" })).toBeVisible();
  await expect(page.getByText("Hidden Draft Post")).toHaveCount(0);
  await expect(page.getByText("Hidden Private Post")).toHaveCount(0);
  await expect(page.getByText("Hidden Future Post")).toHaveCount(0);
});

test("non-public post detail pages are not generated", async ({ page }) => {
  for (const slug of ["draft-post", "private-post", "future-post"]) {
    const response = await page.goto(`/writing/${slug}`);
    expect(response?.status(), `/writing/${slug} should not exist`).toBe(404);
  }
});

test("projects page hides draft projects", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Seed Project" })).toBeVisible();
  await expect(page.getByText("Hidden Draft Project")).toHaveCount(0);
});

test("the sitemap lists only the published post", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/writing/test-post-one");
  for (const slug of ["draft-post", "private-post", "future-post"]) {
    expect(sitemap).not.toContain(`/writing/${slug}`);
  }
});
