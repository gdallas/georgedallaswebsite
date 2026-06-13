# CMS security

Payload is the private admin and API surface for the website. The admin route is authenticated by the `users` collection and protected by server-side access rules.

## Roles

- `owner`: full administrative access, including user management and audit log reads.
- `editor`: authenticated admin access and content mutation access for content collections.
- `read-only`: authenticated admin access and read access without content mutation.
- `api`: service-user role for API keys where a later integration needs one. It is not allowed into the admin UI.

Only owners can create, update, or delete CMS users. Non-owner users may read only their own user document.

The `role` field defaults to `read-only`, but a `beforeChange` hook forces the very first account (when the users collection is empty) to `owner`. The Payload create-first-user screen only collects email and password, so without this the initial owner would be created read-only and locked out of administration.

## Sessions and login safety

Production CMS cookies are marked secure. Payload CSRF protection is limited to `CMS_PUBLIC_URL`, and CORS allows only the configured CMS and public site origins.

Local development uses non-secure cookies so `http://localhost:3000/admin` remains usable.

Payload login protection is configured with:

- session-backed auth enabled
- two-hour token expiration
- five maximum login attempts
- fifteen-minute lockout after too many failed attempts
- auth tokens removed from login/refresh JSON responses

## Audit logging

The `audit-events` collection records security-relevant CMS events. Owners can read audit events; users cannot create, update, or delete them through normal access.

Audit writes run inside the triggering operation's transaction (the `recordAuditEvent` helper passes `req` to `payload.create`). This keeps the audit row atomic with the change it records and lets it reference a not-yet-committed actor — notably the first user, whose own creation triggers the hook. Without the shared transaction the audit insert hit a foreign-key violation against `users` and rolled back the entire signup.

Logged events currently include:

- successful login
- authentication failures where Payload surfaces an auth error hook
- logout
- auth refresh
- user create/update/delete

The audit helper also exposes content create/update/delete event functions for future content collections. Publish-specific logging should be wired when GDW-020 adds publishing states.

## MFA / 2FA decision

Payload 3 local auth in this project exposes password, session, lockout, API key, and custom strategy controls, but the installed auth config does not expose native TOTP/MFA settings.

Accepted approach for this stage:

- keep Payload local auth for the initial CMS foundation
- use strong owner/editor passwords
- keep production admin reachable only at the CMS origin over HTTPS
- use Payload lockout/session protections now
- revisit MFA during GDW-050 with either a supported Payload auth extension, a custom auth strategy, or an external identity provider in front of the CMS

Do not launch production CMS with additional human editors until the GDW-050 hardening pass revisits MFA.
