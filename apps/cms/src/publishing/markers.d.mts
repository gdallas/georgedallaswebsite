export const datedKind: "dated";
export const listingKind: "listing";

export type ContentDoc = {
  id?: string | number;
  status?: string | null;
  visibility?: string | null;
  publishedAt?: string | null;
};

export type RebuildMarker = {
  type: "rebuild";
  collection: string;
  id: string;
  reason: "deleted" | "visible" | "unpublished";
};

export type ScheduleMarker = {
  type: "schedule";
  action: "upsert" | "delete";
  collection: string;
  id: string;
  publishedAt?: string;
};

export type PublishMarker = RebuildMarker | ScheduleMarker;

export function decideMarkers(input: {
  kind?: "dated" | "listing";
  collection: string;
  doc?: ContentDoc | null;
  previousDoc?: ContentDoc | null;
  operation?: "change" | "delete";
  now?: Date | string;
}): PublishMarker[];

export function markerKey(prefix: string, marker: PublishMarker, now?: Date | string): string;
