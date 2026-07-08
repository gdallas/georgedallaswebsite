"use client";

import React from "react";
import { DefaultListView, Thumbnail, useListQuery, useSelection } from "@payloadcms/ui";

// GDW-061: the media library reads as a visual grid of thumbnails rather than a
// database table with previews squeezed into a column. We keep every list
// control by reusing Payload's DefaultListView and only swapping its `Table`
// slot for a card grid: search, filters, sort, pagination, bulk upload, and
// selection all continue to run through Payload's own providers. The grid reads
// the current page from `useListQuery` and selection state from `useSelection`
// (both provided by DefaultListView / the list route), so bulk actions light up
// exactly as they do for the stock table. Card styling lives in custom.css.

const reviewStatusLabels: Record<string, string> = {
  draft: "Draft",
  needs_alt_text: "Needs alt",
  public: "Public",
  private: "Private"
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function MediaGrid() {
  const { data } = useListQuery();
  const { selected, setSelection } = useSelection();
  const docs = (data?.docs ?? []) as Record<string, unknown>[];

  return (
    <ul className="gdw-media-grid">
      {docs.map((doc) => {
        const id = doc.id as number | string;
        const href = `/admin/collections/media/${id}`;
        const isSelected = Boolean(selected?.get(id));
        const review = asString(doc.reviewStatus) || "draft";
        const filename = asString(doc.filename) || String(id);
        const alt = asString(doc.alt).trim();
        const fileSrc = asString(doc.thumbnailURL) || asString(doc.url) || undefined;

        return (
          <li key={id} className="gdw-media-card" data-selected={isSelected}>
            <label className="gdw-media-card__select" aria-label={`Select ${filename}`}>
              <input type="checkbox" checked={isSelected} onChange={() => setSelection(id)} />
            </label>
            <span className={`gdw-media-card__badge gdw-media-card__badge--${review}`}>
              {reviewStatusLabels[review] ?? review}
            </span>
            <a className="gdw-media-card__thumb" href={href}>
              <Thumbnail collectionSlug="media" doc={doc} fileSrc={fileSrc} size="expand" />
            </a>
            <a className="gdw-media-card__name" href={href} title={filename}>
              {filename}
            </a>
            {alt ? (
              <span className="gdw-media-card__alt">{alt}</span>
            ) : (
              <span className="gdw-media-card__alt gdw-media-card__alt--empty">No alt text</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function MediaListView(props: React.ComponentProps<typeof DefaultListView>) {
  return <DefaultListView {...props} Table={<MediaGrid />} />;
}
