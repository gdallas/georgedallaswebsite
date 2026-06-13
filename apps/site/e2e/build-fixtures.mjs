import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startMockCms } from "./mock-cms.mjs";

// Builds the static site against the mock CMS so the E2E suite runs against a
// real production build seeded with deterministic test content. The mock only
// needs to be up during the build (the output is static thereafter).
const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const mock = await startMockCms();
console.log(`[e2e] mock CMS listening on ${mock.url}; building site...`);

const build = spawn("pnpm exec astro build", {
  cwd: siteDir,
  env: { ...process.env, CMS_API_URL: mock.url },
  stdio: "inherit",
  shell: true
});

build.on("exit", async (code) => {
  await mock.close();
  if (code === 0) {
    console.log("[e2e] build complete.");
  } else {
    console.error(`[e2e] build failed with exit code ${code}.`);
  }
  process.exit(code ?? 1);
});
