# Runbook: Contact form and inbox (GDW-039)

The public contact page posts to the CMS endpoint at `/api/contact`. The endpoint validates the configured public-site origin, normalizes the fields, applies simple abuse checks, and stores accepted messages in the admin-only `contact-messages` collection.

Anonymous visitors cannot read or write the collection directly. The public endpoint creates records with controlled server-side data and stores only a one-way IP hash for abuse triage.

## Admin workflow

Open **Inbox -> Contact messages** in Payload. New messages default to `New`; George can mark them `Read`, `Replied`, or `Archived`, and add private notes.

The dashboard also shows a contact inbox tile and a needs-attention link when new clean messages are waiting.

## Spam posture

- Hidden `website` honeypot submissions are silently accepted but not stored.
- Very fast submissions are stored as `Suspected` so George can review or archive them.
- Raw IP addresses are not stored.
- Public submissions require the request origin or referrer to match `PUBLIC_SITE_URL` or `CMS_PUBLIC_URL`.

## Notification status

This ticket creates the inbox and submission path. Email/SMS notification transport should be wired once the project chooses the deployed provider and secret names; the admin inbox works without outbound mail.
