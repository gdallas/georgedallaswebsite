import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const required = [
  "apps/site/src/index.ts",
  "apps/cms/src/payload.config.ts",
  "apps/cms/src/app/api/health/route.ts",
  "packages/shared/src/config.ts"
];

for (const path of required) {
  if (!statSync(path).isFile()) {
    throw new Error(`Missing build input: ${path}`);
  }
}

for (const workspace of ["apps", "packages"]) {
  for (const name of readdirSync(workspace)) {
    const packagePath = join(workspace, name, "package.json");
    if (!statSync(packagePath).isFile()) {
      throw new Error(`Missing package manifest: ${packagePath}`);
    }
  }
}

console.log("Foundation build checks passed.");
