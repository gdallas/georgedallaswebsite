# Runbook: Timeline (GDW-041)

The visual timeline is managed in the CMS through the `timeline-entries` collection and appears publicly at `/timeline`.

## Admin Workflow

Use **Timeline entries -> Create new** or the dashboard **Add timeline entry** action. Each entry supports:

- title and event date
- type: career, project, writing, education, personal, or site update
- summary and rich-text body
- optional media image
- external links
- related posts and projects
- CMS publishing status, visibility, and sort order

Only `status = published` and `visibility = public` entries appear on the public site.

## Public Display

The public route renders an ordered timeline with visible dates and type labels. It uses semantic links and buttons only, so it is keyboard navigable and does not rely on hover-only interactions or heavy animation.

Images should use public media records with useful alt text when the image conveys meaning. Decorative images can use empty alt text through the media record.
