import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const srcDir = dirname(fileURLToPath(import.meta.url));

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

describe("Cedar & Circuitry integration", () => {
  it("imports the global stylesheet exactly once across the site", () => {
    const astroFiles = collectFiles(srcDir, ".astro");
    const importing = astroFiles.filter((path) => readFileSync(path, "utf8").includes("styles/cedar-circuitry.css"));

    assert.equal(importing.length, 1, `cedar-circuitry.css must be imported once, found in: ${importing.join(", ")}`);
    assert.match(importing[0].replaceAll("\\", "/"), /layouts\/BaseLayout\.astro$/);
  });

  it("defines the required design tokens", () => {
    const tokens = readFileSync(join(srcDir, "styles", "tokens.css"), "utf8");

    for (const token of ["--background", "--surface", "--text", "--text-muted", "--border", "--accent", "--link"]) {
      assert.ok(tokens.includes(`${token}:`), `tokens.css must define ${token}`);
    }
  });

  it("uses the brand favicon in the base layout", () => {
    const layout = readFileSync(join(srcDir, "layouts", "BaseLayout.astro"), "utf8");
    assert.ok(layout.includes('href="/brand/favicon.svg"'), "BaseLayout must set the Cedar & Circuitry favicon");
  });
});
