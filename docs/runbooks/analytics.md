# Runbook: Privacy-friendly analytics (GDW-048)

A first-party, cookieless page-view count so George knows which writing gets read
— without creepy tracking or personal data.

## What's collected

On each page load a tiny inline beacon (in `apps/site/src/layouts/BaseLayout.astro`)
sends, via `navigator.sendBeacon`:

- the **path** viewed,
- the **referrer domain** only (never the full referring URL),
- and — only on `/search` — the **search terms**.

The collector adds a coarse **device type** (desktop / mobile / tablet) derived
from the User-Agent. **No IP address, no cookies, no ad IDs, nothing that
identifies or follows a visitor.** The colophon says all of this publicly.

## How it flows

1. **Beacon** → `POST {CMS}/api/analytics/collect` as `text/plain` (a simple
   request, so no CORS preflight; `sendBeacon` is fire-and-forget). The collector
   URL is baked into the static build from `CMS_API_URL`.
2. **Collector** (`app/(payload)/api/analytics/collect/route.ts`) — reached
   through the CMS CloudFront (so `x-origin-verify` is present). It validates
   strictly (rooted paths only, small body), drops anything unusable, and always
   answers **204** so a visitor never sees an error. A per-instance token bucket
   caps DB writes from a flood; **WAF/CloudFront rate limiting is the real edge
   defence in production.** It stores an `analytics-events` row (`overrideAccess`).
3. **`analytics-events`** — minimal, admin-only, hidden from the sidebar. Its
   create/update access is denied to everyone: only the collector writes it.
4. **Analytics view** — `/admin/analytics` (linked in the sidebar under Search).
   A server view that queries the last 30 days with the admin's own permissions
   and renders aggregate counts only: total views, most-read writing, top pages,
   search queries, referrer domains, projects, and device split. No raw rows.

Pure normalization + aggregation live in `apps/cms/src/analytics/analytics.mjs`
with tests (path/referrer/device rules, that only `/search` keeps a query, that
the event never carries an IP, and that the summary is counts-only).

## Notes

- Analytics failure never affects the public site (the beacon is wrapped in
  try/catch and no-ops when the CMS URL isn't configured, e.g. CI builds).
- Retention: the view aggregates a rolling 30-day window and caps at 20k events
  per read. If volume ever grows, add a scheduled rollup/prune — not needed at
  this site's traffic.
- Admin-only: both the events collection and the view require a content role.
