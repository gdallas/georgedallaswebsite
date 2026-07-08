"use client";

import React from "react";

// List-view cell for the Books collection (George feedback, 2026-07-08): show
// the cover so the reading log reads visually, not as a table of titles. Prefers
// a manually uploaded coverImage, then the auto-filled coverUrl; falls back to a
// quiet placeholder so rows stay aligned.
type BookCoverCellProps = {
  cellData?: unknown;
  rowData?: Record<string, unknown>;
};

function resolveCoverSrc(cellData: unknown, rowData?: Record<string, unknown>): string {
  const coverImage = rowData?.coverImage;
  if (coverImage && typeof coverImage === "object" && typeof (coverImage as { url?: unknown }).url === "string") {
    return (coverImage as { url: string }).url;
  }
  if (typeof cellData === "string" && cellData.trim().length > 0) {
    return cellData;
  }
  const coverUrl = rowData?.coverUrl;
  return typeof coverUrl === "string" ? coverUrl : "";
}

export function BookCoverCell({ cellData, rowData }: BookCoverCellProps) {
  const src = resolveCoverSrc(cellData, rowData);
  const title = typeof rowData?.title === "string" ? rowData.title : "";

  if (!src) {
    return <span className="gdw-book-cover gdw-book-cover--empty" aria-hidden="true" />;
  }

  return (
    <img
      className="gdw-book-cover"
      src={src}
      alt={title ? `Cover of ${title}` : ""}
      loading="lazy"
    />
  );
}
