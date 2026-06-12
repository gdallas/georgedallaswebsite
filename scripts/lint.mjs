import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ignoredDirectories = new Set([".git", "node_modules", ".pnpm-store", "dist", "cdk.out", "local-data"]);
const checkedExtensions = new Set([".js", ".mjs", ".ts", ".json", ".md", ".yml", ".yaml"]);
const errors = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (![...checkedExtensions].some((ext) => path.endsWith(ext))) continue;
    lintFile(path);
  }
}

function lintFile(path) {
  const content = readFileSync(path, "utf8");
  const normalizedPath = path.replaceAll("\\", "/");
  if (content.includes("\t")) {
    errors.push(`${path}: tabs are not allowed`);
  }
  if (!normalizedPath.startsWith("CODEX_") && !normalizedPath.startsWith("docs/personal-website-") && /[ \t]+\r?\n/.test(content)) {
    errors.push(`${path}: trailing whitespace found`);
  }
  if (!content.endsWith("\n")) {
    errors.push(`${path}: file must end with a newline`);
  }
  if (path.endsWith(".ts") && normalizedPath !== "packages/shared/src/config.ts" && content.includes("process.env")) {
    errors.push(`${path}: use the shared config loader instead of raw process.env`);
  }
}

walk(".");

if (errors.length > 0) {
  throw new Error(`Lint failed:\n- ${errors.join("\n- ")}`);
}

console.log("Lint checks passed.");
