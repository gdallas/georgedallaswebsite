import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

// Static, dependency-free accessibility smoke checks. They scan the Astro
// source for structural invariants that protect the WCAG 2.2 AA baseline (see
// docs/runbooks/accessibility.md). They are not a substitute for the manual
// review checklist in that runbook — they guard against regressions that are
// cheap to catch in source.

const srcDir = dirname(fileURLToPath(import.meta.url));
const stylesDir = join(srcDir, "styles");
const pagesDir = join(srcDir, "pages");
const layoutPath = join(srcDir, "layouts", "BaseLayout.astro");

function collectFiles(directory, extension, results = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      collectFiles(path, extension, results);
      continue;
    }
    if (path.endsWith(extension)) {
      results.push(path);
    }
  }
  return results;
}

const astroFiles = collectFiles(srcDir, ".astro");
const globalCss = readFileSync(join(stylesDir, "cedar-circuitry.css"), "utf8");
const layout = readFileSync(layoutPath, "utf8");

describe("accessibility baseline", () => {
  it("sets a document language on the root element", () => {
    assert.match(layout, /<html[^>]*\blang=/, "BaseLayout must set <html lang>");
  });

  it("provides a skip link to the main content", () => {
    assert.match(layout, /class="skip-link"/, "BaseLayout must render a skip link");
    assert.match(layout, /id="main"/, "BaseLayout must mark the main landmark target");
  });

  it("uses the semantic main landmark", () => {
    assert.match(layout, /<main\b/, "BaseLayout must wrap content in <main>");
  });

  it("defines visible focus states in the global stylesheet", () => {
    assert.match(globalCss, /:focus-visible/, "global CSS must style :focus-visible");
    assert.match(globalCss, /--focus-ring/, "focus states should use the shared focus ring token");
  });

  it("respects the reduced-motion preference", () => {
    assert.match(
      globalCss,
      /@media \(prefers-reduced-motion: reduce\)/,
      "global CSS must honor prefers-reduced-motion"
    );
  });

  it("renders every page inside the BaseLayout landmarks", () => {
    const pageFiles = collectFiles(pagesDir, ".astro").filter(
      // The catch-all redirect route emits a bare noindex meta-refresh document
      // (no human-facing landmarks); it is not a content page (GDW-033).
      (path) => !path.endsWith("[...redirect].astro")
    );
    assert.ok(pageFiles.length > 0, "expected at least one .astro page");
    for (const path of pageFiles) {
      const source = readFileSync(path, "utf8");
      assert.match(source, /BaseLayout/, `${relative(srcDir, path)} must render inside BaseLayout`);
    }
  });

  it("gives every image an alt attribute (empty for decorative)", () => {
    for (const path of astroFiles) {
      const source = readFileSync(path, "utf8");
      const images = source.match(/<img\b[^>]*>/g) ?? [];
      for (const tag of images) {
        assert.match(tag, /\balt=/, `<img> without alt in ${relative(srcDir, path)}: ${tag}`);
      }
    }
  });

  it("never uses a positive tabindex (which breaks natural tab order)", () => {
    for (const path of astroFiles) {
      const source = readFileSync(path, "utf8");
      assert.ok(
        !/tabindex=["']?[1-9]/.test(source),
        `positive tabindex found in ${relative(srcDir, path)}`
      );
    }
  });

  it("keeps interactivity on native elements (no onclick handlers)", () => {
    for (const path of astroFiles) {
      const source = readFileSync(path, "utf8");
      assert.ok(!/\sonclick=/i.test(source), `onclick handler found in ${relative(srcDir, path)}`);
    }
  });

  it("marks every external (new-tab) link with rel=noopener", () => {
    for (const path of astroFiles) {
      const source = readFileSync(path, "utf8");
      const newTabLinks = source.match(/<a\b[^>]*target=["']_blank["'][^>]*>/g) ?? [];
      for (const tag of newTabLinks) {
        assert.match(tag, /rel=["'][^"']*noopener/, `new-tab link missing rel=noopener in ${relative(srcDir, path)}: ${tag}`);
      }
    }
  });
});
