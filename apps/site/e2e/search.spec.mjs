import { expect, test } from "@playwright/test";

// Proves the public Pagefind index (built from the static output) surfaces
// published content and never leaks drafts/private/future content. The fixtures
// seed one published post ("Test Post One") plus several unpublished items whose
// titles all contain the word "Hidden" — which never appears in any published,
// rendered page, so a search for it must return nothing.

async function search(page, query) {
  await page.goto("/search");
  const input = page.locator("input.pagefind-ui__search-input");
  await expect(input).toBeVisible();
  await input.fill(query);
}

test("public search finds a published post and links to it", async ({ page }) => {
  await search(page, "Test Post One");
  const result = page.locator(".pagefind-ui__result-link", { hasText: "Test Post One" });
  await expect(result.first()).toBeVisible({ timeout: 15_000 });
  await expect(result.first()).toHaveAttribute("href", /\/writing\/test-post-one/);
});

test("public search does not surface draft, private, or future content", async ({ page }) => {
  await search(page, "Hidden");
  // Let Pagefind load its index and run (debounced) before asserting absence.
  await expect(page.locator(".pagefind-ui__message")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".pagefind-ui__result")).toHaveCount(0);

  const body = await page.locator("body").innerText();
  for (const leak of ["draft-post", "private-post", "future-post", "Hidden Draft", "Hidden Private", "Hidden Future"]) {
    expect(body).not.toContain(leak);
  }
});
