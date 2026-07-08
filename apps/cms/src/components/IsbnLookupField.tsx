"use client";

import { useConfig, useField, useFormFields } from "@payloadcms/ui";
import { useState } from "react";
import { useIsbnLookup } from "../books/useIsbnLookup";
import styles from "./IsbnLookupField.module.css";

// Books edit-form helper (GDW-046): watches the ISBN field and, as soon as a
// valid ISBN is typed or pasted, offers the looked-up title, author, and cover
// to apply. Lookup runs in the browser (the CMS Lambda has no egress); a miss
// or an error never blocks manual entry.
export function IsbnLookupField() {
  const isbn = useFormFields(([fields]) => {
    const value = fields?.isbn?.value;
    return typeof value === "string" ? value : "";
  });
  const { config } = useConfig();
  const titleField = useField<string>({ path: "title" });
  const authorField = useField<string>({ path: "author" });
  const coverField = useField<unknown>({ path: "coverImage" });
  const { status, book } = useIsbnLookup(isbn);
  const [cover, setCover] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });

  const applyDetails = () => {
    if (book?.title) {
      titleField.setValue(book.title);
    }
    if (book?.author) {
      authorField.setValue(book.author);
    }
  };

  // Covers from Open Library / Google Books are CORS-open, so the browser can
  // fetch the bytes and upload them through the admin session. If a given host
  // blocks it, we say so rather than failing the form.
  const useCover = async () => {
    if (!book?.coverUrl) {
      return;
    }
    setCover({ busy: true, note: null });
    try {
      const res = await fetch(book.coverUrl);
      if (!res.ok) {
        throw new Error("cover fetch failed");
      }
      const blob = await res.blob();
      const file = new File([blob], `isbn-${book.isbn}.jpg`, { type: blob.type || "image/jpeg" });
      const data = new FormData();
      data.append("file", file);
      const upload = await fetch(`${config.routes.api}/media`, {
        method: "POST",
        body: data,
        credentials: "same-origin"
      });
      const json = (await upload.json().catch(() => null)) as { doc?: { id?: number | string } } | null;
      const id = json?.doc?.id;
      if (upload.ok && id != null) {
        coverField.setValue(id);
        setCover({ busy: false, note: "Cover added to the media library — add alt text before it goes public." });
      } else {
        setCover({ busy: false, note: "Could not save that cover automatically. Add it under Cover image if you want it." });
      }
    } catch {
      setCover({ busy: false, note: "Could not fetch that cover automatically. Add it under Cover image if you want it." });
    }
  };

  return (
    <div className={styles.wrap}>
      {status === "idle" && (
        <p className={styles.hint}>Type or paste an ISBN above to look up the title, author, and cover.</p>
      )}
      {status === "invalid" && <p className={styles.hint}>Keep typing — that isn’t a complete ISBN yet.</p>}
      {status === "looking" && <p className={styles.hint}>Looking up {isbn}…</p>}
      {status === "notfound" && (
        <p className={styles.hint}>No match for {isbn}. You can still fill in the details by hand.</p>
      )}
      {status === "error" && <p className={styles.hint}>Lookup is unavailable right now. Enter the details by hand.</p>}
      {status === "found" && book && (
        <div className={styles.card}>
          {book.coverUrl ? <img className={styles.cover} src={book.coverUrl} alt="" /> : null}
          <div className={styles.body}>
            <p className={styles.cardTitle}>{book.title}</p>
            {book.author ? <p className={styles.cardMeta}>{book.author}</p> : null}
            <p className={styles.cardMeta}>
              {[book.publishYear, book.pageCount ? `${book.pageCount} pages` : null, book.source]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.apply} onClick={applyDetails}>
                Use title &amp; author
              </button>
              {book.coverUrl ? (
                <button type="button" className={styles.secondary} onClick={useCover} disabled={cover.busy}>
                  {cover.busy ? "Saving cover…" : "Use this cover"}
                </button>
              ) : null}
            </div>
            {cover.note ? <p className={styles.note}>{cover.note}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
