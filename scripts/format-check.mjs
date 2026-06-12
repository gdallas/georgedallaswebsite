import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const requiredScripts = ["dev", "lint", "typecheck", "test", "build", "format"];

for (const script of requiredScripts) {
  if (!packageJson.scripts?.[script]) {
    throw new Error(`package.json is missing required script: ${script}`);
  }
}

console.log("Format configuration check passed.");
