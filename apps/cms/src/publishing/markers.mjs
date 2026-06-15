// Pure decision logic: given a content change (or delete), what publishing
// signals must escape the VPC-isolated CMS? The CMS has no internet egress, so
// it writes these markers to the control S3 bucket and an internet-capable
// worker Lambda acts on them (GDW-035). Kept pure and dependency-light so the
// behaviour is unit-testable without S3 or Payload.

import { isPublicBuildVisible, isPublicListingVisible } from "@georgedallas/shared/visibility";

// "dated" content (posts, pages) has a publishedAt window and supports
// scheduling; "listing" content (projects, links) is status+visibility only.
export const datedKind = "dated";
export const listingKind = "listing";

function isVisible(kind, doc, now) {
  if (!doc) {
    return false;
  }
  return kind === datedKind ? isPublicBuildVisible(doc, now) : isPublicListingVisible(doc);
}

// Decide the markers to emit for one collection mutation.
//   operation: "change" (create/update) | "delete"
//   doc:        the current doc ("change") or the deleted doc ("delete")
//   previousDoc: the prior doc on update; undefined on create/delete
// Returns an array of marker objects (possibly empty). The site only rebuilds
// when the public view actually changes, so unrelated draft edits stay quiet.
export function decideMarkers({ kind = datedKind, collection, doc, previousDoc, operation = "change", now = new Date() }) {
  const markers = [];
  const id = (operation === "delete" ? doc?.id : doc?.id ?? previousDoc?.id) ?? null;
  if (id == null) {
    return markers;
  }

  const visibleNow = operation === "delete" ? false : isVisible(kind, doc, now);
  const visibleBefore = operation === "delete" ? isVisible(kind, doc, now) : isVisible(kind, previousDoc, now);

  if (visibleNow || visibleBefore) {
    markers.push({
      type: "rebuild",
      collection,
      id: String(id),
      reason: operation === "delete" ? "deleted" : visibleNow ? "visible" : "unpublished"
    });
  }

  if (kind === datedKind) {
    const isScheduled = operation === "change" && doc?.status === "scheduled" && Boolean(doc?.publishedAt);
    const wasScheduled = operation === "delete" ? doc?.status === "scheduled" : previousDoc?.status === "scheduled";

    if (isScheduled) {
      markers.push({
        type: "schedule",
        action: "upsert",
        collection,
        id: String(id),
        publishedAt: new Date(doc.publishedAt).toISOString()
      });
    } else if (wasScheduled) {
      // Left the scheduled state (published early, reverted to draft, or
      // deleted) — cancel any pending one-shot schedule.
      markers.push({ type: "schedule", action: "delete", collection, id: String(id) });
    }
  }

  return markers;
}

// S3 object key for a marker. Markers are content-addressed by type+collection+id
// (+ a timestamp for rebuilds) so a burst of edits coalesces sensibly: schedule
// markers overwrite per-doc (latest intent wins); rebuild markers are unique per
// event but the worker dispatches an idempotent, debounced rebuild anyway.
export function markerKey(prefix, marker, now = new Date()) {
  const base = `${prefix}${marker.type}/${marker.collection}/${marker.id}`;
  if (marker.type === "schedule") {
    return `${base}.json`;
  }
  return `${base}.${new Date(now).getTime()}.json`;
}
