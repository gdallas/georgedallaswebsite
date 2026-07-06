# Public site hosting runbook

The public Astro site is static-first: the build is synced to a private S3 bucket and served through CloudFront with an ACM certificate in us-east-1. There is no always-on compute, so idle cost is effectively zero (see `cost-controls.md`).

## URLs

- Dev: `https://dev.georgedallas.com`
- Prod: `https://georgedallas.com` and `https://www.georgedallas.com` (defined, deployed at launch prep — GDW-051)

Both environments share the same Route 53 zone (`georgedallas.com`) and the same hosted-zone alias pattern as the CMS.

## Architecture

```text
Browser
  ↓ HTTPS (REDIRECT_TO_HTTPS, ACM cert in us-east-1)
CloudFront (PriceClass_100, CACHING_OPTIMIZED)
  ↓ viewer-request CloudFront Function rewrites /route → /route/index.html
  ↓ Origin Access Control (signed S3 reads)
Private S3 bucket (georgedallaswebsite-<env>-site, BLOCK_ALL public access)
```

- The S3 bucket blocks all public access; only CloudFront (through OAC) can read it, and only the GitHub deploy role can write to it.
- An S3 REST origin behind OAC serves objects by exact key and does not resolve directory indexes, but Astro emits pages as `<route>/index.html`. A CloudFront Function (viewer-request) appends `index.html` to directory URIs so clean URLs resolve. A path whose last segment contains a `.` is treated as a file and passed through unchanged, so avoid dots in page slugs.
- `priceClass` is `PriceClass_100` (North America + Europe edges) — the cheapest tier that covers the expected audience.
- `astro.config.mjs` pins `site: "https://georgedallas.com"`, so canonical URLs always point at production; dev serves the same build under `dev.georgedallas.com`.
- Missing paths render the custom 404 page: the Astro build emits `/404.html` and the distribution maps origin 403/404 responses to it with a 404 status (private S3 REST origins answer 403 for absent keys). Wired in `infra/src/site-hosting.mjs` (GDW-042).

## Deployment

Merge to `develop` triggers `.github/workflows/deploy-dev.yml`:

1. GitHub OIDC assumes `georgedallaswebsite-dev-github-deploy` (no long-lived keys).
2. `cdk deploy dev-foundation dev-cms-cert dev-cms dev-site-cert dev-site` provisions/updates the stacks and writes stack outputs to `cdk-outputs.json`.
3. The CMS health smoke test runs first, so the site build fetches from a confirmed-healthy CMS.
4. `pnpm --filter @georgedallas/site build` runs with `CMS_API_URL=https://cms-dev.georgedallas.com` so the build pulls real published content through CloudFront (which injects the `x-origin-verify` header the CMS requires). Only published, public content is returned.
5. The build is synced to the site bucket with `aws s3 sync --delete`, then the whole distribution is invalidated (`--paths "/*"`).
6. A public-site smoke test polls `https://dev.georgedallas.com/` with retries.

The deploy role gets S3 write access to the site bucket and `cloudfront:CreateInvalidation` through `security-foundation.mjs`; the bucket is referenced by ARN string (its name is deterministic) to avoid a cross-stack dependency on the site stack.

## Cache invalidation

Every deploy invalidates `/*`, which counts as a single invalidation path (the first 1,000 paths/month are free), so correctness never depends on cache TTLs. Astro fingerprints hashed assets under `_astro/`, so they are safe to cache long-term; HTML is re-fetched after each invalidation.

## First deploy / propagation

The first deploy of a brand-new distribution waits on ACM DNS validation and CloudFront global propagation as part of `cdk deploy`. If the public-site smoke test fails purely due to edge propagation lag on the very first deploy, re-running the workflow (no code change needed) usually passes.

## Production

Production stacks (`prod-site-cert`, `prod-site`) are defined but deliberately **not deployed** until launch prep (GDW-051). The prod certificate covers both `georgedallas.com` and `www.georgedallas.com`; both domains currently serve identical content (a canonical `www` → apex redirect can be added with the SEO work in GDW-027).
