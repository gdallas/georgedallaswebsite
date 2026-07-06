# ADR: Defer growth features (GDW-043…049) to post-launch

Date: 2026-07-06
Status: accepted

## Context

The backlog (`CODEX_IMPLEMENTATION_TICKETS.md`) reaches launch readiness at
GDW-050/051. Between the public-site polish (GDW-042) and that launch gate sit
seven optional feature tickets. Each one explicitly allows deferral or asks for
a documented approach. Launching sooner with a smaller, well-hardened surface
beats launching later with more moving parts — every one of these features is
additive and none requires rework to add after launch.

## Decision

Defer GDW-043 through GDW-049 until after production launch, with the
following per-ticket positions:

- **GDW-043 — Notes / Start Here / Resources / Uses:** all four routes are
  deferred. None appears in navigation or the sitemap. When wanted, Start
  Here/Uses fit the existing Pages collection; Notes/Resources would get their
  own collections if filtering is needed.
- **GDW-044 — Newsletter:** deferred entirely at launch; RSS is the
  subscription mechanism (already live). Documented approach when revisited:
  start with an external privacy-friendly provider (e.g. Buttondown) linked
  from the site — no subscriber PII in this system, no SES sending path to
  harden — with a migration path to a native SES implementation only if the
  provider becomes limiting. A native build adds subscriber data protection,
  double opt-in, bounce handling, and abuse controls; that cost is not
  justified before there is an audience.
- **GDW-045 — GitHub project sync:** deferred. The Projects collection is
  curated by hand; volume does not justify automation yet.
- **GDW-046 — ISBN lookup helper:** deferred. Bookshelf entries are entered
  by hand; the helper becomes worthwhile only at much higher volume.
- **GDW-047 — Webmentions:** deferred. It adds a public write endpoint
  (spam/moderation surface) for little value at current readership. If
  revisited, mentions enter a moderation queue and render only after approval,
  per the ticket.
- **GDW-048 — Analytics:** the launch approach is documented as **no
  analytics at all** — no script, no pixel, no cookies (stated publicly on
  `/colophon`). If insight is ever needed, first preference is aggregate,
  IP-free CloudFront standard-log analysis run offline; any change gets an ADR
  and a colophon update first.
- **GDW-049 — Content calendar / writing stats / changelog:** deferred. The
  admin dashboard, scheduled-publishing view, and audit log cover the current
  need; revisit when there is enough content cadence for a calendar to matter.

## Consequences

- The launch path is GDW-042 → GDW-050 (threat model) → GDW-051 (cutover),
  then GDW-052 (maintenance automation).
- The GDW-050 threat model covers only the shipped surface; any deferred
  feature that later lands (newsletter, webmentions especially) must extend
  the threat model in the same PR.
- Deferred routes must stay out of navigation and the sitemap until
  implemented (currently true).
- Revisit this ADR when there is a concrete audience need (newsletter),
  content volume (ISBN/calendar), or reader interaction (webmentions) that
  changes the trade-off.
