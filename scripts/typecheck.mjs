import { readFileSync, statSync } from "node:fs";

const configs = ["tsconfig.json", "tsconfig.base.json", "apps/site/tsconfig.json", "apps/cms/tsconfig.json", "packages/shared/tsconfig.json"];

for (const config of configs) {
  JSON.parse(readFileSync(config, "utf8"));
}

const sourceFiles = ["apps/site/src/index.ts", "apps/cms/src/index.ts", "packages/shared/src/index.ts", "packages/shared/src/config.ts", "packages/shared/src/config.mjs"];
for (const sourceFile of sourceFiles) {
  if (!statSync(sourceFile).isFile()) {
    throw new Error(`Missing TypeScript source file: ${sourceFile}`);
  }
}

console.log("TypeScript configuration checks passed.");
