import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("local-data", { recursive: true });
writeFileSync(
  "local-data/seed-summary.json",
  `${JSON.stringify({
    seededAt: new Date(0).toISOString(),
    note: "Safe placeholder seed marker. Real CMS seed data is tracked in later tickets."
  }, null, 2)}\n`
);

console.log("Local seed marker written to local-data/seed-summary.json.");
