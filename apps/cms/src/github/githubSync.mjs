// Pure logic behind the GitHub project sync (GDW-045). The CMS Lambda has no
// internet egress, so a scheduled GitHub Action fetches the repos and POSTs them
// to the internal sync endpoint, signed with an HMAC over the raw body (keyed by
// the shared webhook secret) — the same scheme the publishing worker uses. This
// module maps the GitHub API shape to our stored fields and verifies inbound
// requests; IO (the fetch, the DB) lives in the Action runner and the route so
// this stays unit-testable with mocked responses.

import { verifyPayloadSignature } from "@georgedallas/shared/scheduling";

const MAX_REPOS = 500;
const defaultMaxSkewMs = 10 * 60 * 1000; // 10 min: covers Action + CMS cold start

function str(value) {
  return typeof value === "string" ? value : "";
}

function num(value) {
  return Number.isFinite(value) ? value : 0;
}

function nullableStr(value) {
  const s = str(value);
  return s.length > 0 ? s : null;
}

// Coerce an already-mapped (stored-shape) repo from a signed request body, so a
// malformed payload can't write junk. Mirrors mapGithubRepo's output shape but
// reads the stored keys (the Action maps API -> stored before signing).
export function normalizeStoredRepo(repo = {}) {
  return {
    githubId: num(repo.githubId),
    name: str(repo.name),
    fullName: str(repo.fullName),
    description: nullableStr(repo.description),
    url: str(repo.url),
    homepage: nullableStr(repo.homepage),
    stars: num(repo.stars),
    forks: num(repo.forks),
    language: nullableStr(repo.language),
    topics: Array.isArray(repo.topics) ? repo.topics.filter((t) => typeof t === "string") : [],
    pushedAt: nullableStr(repo.pushedAt),
    isArchived: Boolean(repo.isArchived),
    isFork: Boolean(repo.isFork)
  };
}

// Normalize one GitHub REST API repo object to the fields we store. Unknown or
// missing fields degrade to empty/zero rather than throwing.
export function mapGithubRepo(repo = {}) {
  return {
    githubId: num(repo.id),
    name: str(repo.name),
    fullName: str(repo.full_name),
    description: str(repo.description) || null,
    url: str(repo.html_url),
    homepage: str(repo.homepage) || null,
    stars: num(repo.stargazers_count),
    forks: num(repo.forks_count),
    language: str(repo.language) || null,
    topics: Array.isArray(repo.topics) ? repo.topics.filter((t) => typeof t === "string") : [],
    pushedAt: str(repo.pushed_at) || null,
    isArchived: Boolean(repo.archived),
    isFork: Boolean(repo.fork)
  };
}

// The signed body the Action sends. Stable shape so both sides serialize the
// same bytes; the raw JSON string is what gets signed.
export function buildSyncBody(apiRepos, now = Date.now()) {
  const repos = (Array.isArray(apiRepos) ? apiRepos : []).slice(0, MAX_REPOS).map(mapGithubRepo).filter((r) => r.githubId > 0 && r.fullName);
  return JSON.stringify({ syncedAt: Number(now), repos });
}

// Verify + parse an inbound sync request. Returns { ok, repos, syncedAt } or
// { ok: false, reason } so the route can answer 4xx without leaking the reason.
export function verifySyncRequest(rawBody, signature, secret, options = {}) {
  if (!verifyPayloadSignature(rawBody, signature, secret)) {
    return { ok: false, reason: "invalid_signature" };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "invalid_body" };
  }

  const syncedAt = Number(parsed?.syncedAt);
  if (!Number.isFinite(syncedAt) || !Array.isArray(parsed?.repos)) {
    return { ok: false, reason: "invalid_body" };
  }

  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const maxSkewMs = options.maxSkewMs ?? defaultMaxSkewMs;
  if (Math.abs(now - syncedAt) > maxSkewMs) {
    return { ok: false, reason: "stale_request" };
  }

  if (parsed.repos.length > MAX_REPOS) {
    return { ok: false, reason: "too_many_repos" };
  }

  // The Action already mapped API -> stored shape before signing; normalize
  // defensively (drop extra keys, coerce types) without re-reading API fields.
  const repos = parsed.repos.map(normalizeStoredRepo).filter((r) => r.githubId > 0 && r.fullName);
  return { ok: true, repos, syncedAt };
}

// Slug matching validateSlug (lowercase letters, numbers, single hyphens).
export function repoSlug(repo = {}) {
  const base = (str(repo.name) || str(repo.fullName).split("/").pop() || "project").toLowerCase();
  const slug = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "project";
}

// Fields to seed a Project when a repo is promoted. Keeps George's curated
// project copy primary: the promote hook only *creates* a draft/private project
// (never publishes, never overwrites an existing one on later syncs).
export function projectDraftFromRepo(repo = {}) {
  const technologies = [repo.language, ...(Array.isArray(repo.topics) ? repo.topics : [])]
    .filter((t) => typeof t === "string" && t.length > 0)
    .slice(0, 12);
  return {
    title: str(repo.name) || str(repo.fullName) || "Untitled project",
    slug: repoSlug(repo),
    summary: str(repo.description) || null,
    githubUrl: str(repo.url) || null,
    liveUrl: str(repo.homepage) || null,
    technologies,
    status: "draft",
    visibility: "private"
  };
}
