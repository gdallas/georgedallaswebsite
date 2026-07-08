"use client";

import { useField, useFormFields } from "@payloadcms/ui";
import { useIsbnLookup } from "../books/useIsbnLookup";
import styles from "./IsbnLookupField.module.css";

// Books edit-form helper (GDW-046): watches the ISBN field and, as soon as a
// valid ISBN is typed or pasted, offers the looked-up title, author, and cover
// to apply. Lookup runs in the browser (the CMS Lambda has no egress); a miss
// or an error never blocks manual entry. "Use these details" fills the title,
// author, and cover URL in one click (George feedback, 2026-07-08): the cover
// URL is stored directly, so a book gets a cover with no upload step.
export function IsbnLookupField() {
  const isbn = useFormFields(([fields]) => {
    const value = fields?.isbn?.value;
    return typeof value === "string" ? value : "";
  });
  const titleField = useField<string>({ path: "title" });
  const authorField = useField<string>({ path: "author" });
  const coverUrlField = useField<string>({ path: "coverUrl" });
  const { status, book } = useIsbnLookup(isbn);

  const applyDetails = () => {
    if (book?.title) {
      titleField.setValue(book.title);
    }
    if (book?.author) {
      authorField.setValue(book.author);
    }
    if (book?.coverUrl) {
      coverUrlField.setValue(book.coverUrl);
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
                {book.coverUrl ? "Use these details" : "Use title & author"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
