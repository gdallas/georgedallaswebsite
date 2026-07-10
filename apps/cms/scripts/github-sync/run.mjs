// GitHub project sync runner (GDW-045). Runs in the scheduled GitHub Action
// (which has internet egress, unlike the CMS Lambda): fetches the owner's public
// repos from the GitHub REST API, then POSTs them to the CMS internal sync
// endpoint signed with an HMAC over the raw body. Reuses the shared signer and
// the tested mapping so the wire format matches the endpoint exactly.
//
// Env: CMS_URL (required), CMS_SYNC_SECRET (required, = the CMS webhook secret),
// SYNC_GITHUB_USER (default "gdallas"; GitHub reserves GITHUB_* for its own
// variable names), GITHUB_TOKEN (optional, raises the API rate limit).

import { publishSignatureHeader, signPayload } from "@georgedallas/shared/scheduling";
import { buildSyncBody } from "../../src/github/githubSync.mjs";

const user = process.env.SYNC_GITHUB_USER || "gdallas";
const cmsUrl = (process.env.CMS_URL || "").replace(/\/+$/, "");
const secret = process.env.CMS_SYNC_SECRET || "";

if (!cmsUrl || !secret) {
  console.error("CMS_URL and CMS_SYNC_SECRET are required.");
  process.exit(1);
}

async function fetchRepos() {
  const headers = { accept: "application/vnd.github+json", "user-agent": "gdw-github-sync" };
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const repos = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = `https://api.github.com/users/${user}/repos?per_page=100&page=${page}&sort=pushed&type=owner`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status} for ${url}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }
    repos.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }
  return repos;
}

const repos = await fetchRepos();
console.log(`Fetched ${repos.length} repositories for ${user}.`);

const body = buildSyncBody(repos);
const res = await fetch(`${cmsUrl}/api/internal/github-sync`, {
  method: "POST",
  headers: { "content-type": "application/json", [publishSignatureHeader]: signPayload(body, secret) },
  body
});

const json = await res.json().catch(() => ({}));
console.log(`Sync endpoint responded ${res.status}:`, JSON.stringify(json));
if (!res.ok) {
  process.exit(1);
}
