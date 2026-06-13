# End-to-end testing runbook

Playwright smoke tests give confidence that the public site, its discoverability
endpoints, and visibility filtering work after a change. They run against a real
production build of the site seeded with deterministic fixtures.

## How it works

1. `apps/site/e2e/mock-cms.mjs` starts a tiny HTTP server that returns the
   fixtures in `apps/site/e2e/fixtures.mjs` for the Payload REST paths the site
   reads. It ignores the published where-clause and returns everything — a
   draft, a private post, a future-scheduled post, and a draft project — so the
   **site's** visibility filtering is what gets exercised.
2. `apps/site/e2e/build-fixtures.mjs` runs `astro build` with
   `CMS_API_URL` pointed at that mock, producing a static build with seed
   content.
3. Playwright (`playwright.config.mjs`) serves the build with `astro preview`
   and runs the specs in `apps/site/e2e/*.spec.mjs`.

No database, CMS, or secrets are needed, and no production credentials are ever
used.

## Running locally

```bash
# one-time: download the Chromium browser
pnpm --filter @georgedallas/site e2e:install

# build against the mock CMS and run the smoke suite
pnpm e2e            # from the repo root
# or: pnpm --filter @georgedallas/site e2e

# open the HTML report after a run
pnpm --filter @georgedallas/site e2e:report
```

## What is covered

- **Public pages:** home, writing index, writing detail (seed post), projects,
  links, now, contact — each asserts its landmark/heading and seeded content.
- **Navigation:** the main nav links resolve to their pages.
- **Discoverability:** `/robots.txt`, `/sitemap.xml`, `/rss.xml` are served.
- **Visibility (leakage):** draft/private/future posts never appear on the
  writing index, their detail pages 404, draft projects are hidden, and the
  sitemap lists only the published post. This complements the unit-level
  visibility tests in `packages/shared` and `apps/site/src/lib/cms.test.mjs`.

## CMS / admin smoke tests (opt-in)

`apps/site/e2e/cms.spec.mjs` covers CMS health and admin login. They are
**skipped unless** a safe, non-production target is provided via environment
variables — credentials are never committed:

```bash
CMS_E2E_URL=https://cms-dev.georgedallas.com \
CMS_E2E_EMAIL=<test admin email> \
CMS_E2E_PASSWORD=<test admin password> \
  pnpm --filter @georgedallas/site exec playwright test cms.spec.mjs
```

The deploy-dev workflow already smoke-tests CMS health on every deploy, so the
health path is continuously exercised even without running this spec.

## CI

The `E2E Smoke` job in `.github/workflows/ci.yml` runs the public + visibility
specs on every PR (Chromium only). The CMS specs stay skipped in CI because no
`CMS_E2E_URL` is configured there.
