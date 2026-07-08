"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { documentEditHref } from "../dashboard/dashboardData.mjs";
import {
  buildBookBody,
  buildDraftPostBody,
  buildNowUpdateBody,
  payloadErrorMessage,
  quickImageMimeTypes,
  uniqueSlugVariant,
  validateQuickImage
} from "../dashboard/quickCapture.mjs";
import styles from "./Dashboard.module.css";

// Quick capture (GDW-063): the four ways a week starts — a post title, a Now
// update, an image, a book — as live fields on the dashboard, so nothing
// needs a navigation click before the real work begins. Writes go through
// Payload's REST API with the admin's own cookie session; drafts rely on the
// collections' safe defaults (draft + private).

type CardProps = {
  adminRoute: string;
  apiRoute: string;
};

type Note = {
  tone: "ok" | "error";
  text: string;
  href?: string;
  hrefLabel?: string;
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => null)) as { doc?: { id?: number | string } } | null;
  return { ok: res.ok, status: res.status, json };
}

function CaptureNote({ note }: { note: Note | null }) {
  if (!note) {
    return null;
  }

  return (
    <p className={styles.captureNote} data-tone={note.tone}>
      {note.text}
      {note.href ? (
        <>
          {" "}
          <a href={note.href}>{note.hrefLabel}</a>
        </>
      ) : null}
    </p>
  );
}

function PostCapture({ adminRoute, apiRoute }: CardProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = buildDraftPostBody(title);

    if (!body || busy) {
      return;
    }

    setBusy(true);
    setNote(null);
    let result = await postJson(`${apiRoute}/posts`, body);

    // A 400 here is almost always a slug collision with an earlier post of
    // the same name; retry once with a suffixed slug before giving up.
    if (!result.ok && result.status === 400) {
      result = await postJson(`${apiRoute}/posts`, { ...body, slug: uniqueSlugVariant(body.slug) });
    }

    const id = result.json?.doc?.id;

    if (result.ok && id != null) {
      router.push(documentEditHref(adminRoute, "posts", id));
      return;
    }

    setBusy(false);
    setNote({
      tone: "error",
      text: payloadErrorMessage(result.json, "Could not start the draft. Try again.")
    });
  };

  return (
    <form className={styles.captureCard} onSubmit={submit}>
      <span className={styles.captureKicker}>New post</span>
      <div className={styles.captureFields}>
        <input
          aria-label="New post title"
          autoFocus
          className={`${styles.captureInput} ${styles.captureTitleInput}`}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A title to start writing…"
          type="text"
          value={title}
        />
      </div>
      <button className={styles.captureSubmit} disabled={busy || !title.trim()} type="submit">
        {busy ? "Starting…" : "Start draft"}
      </button>
      <CaptureNote note={note} />
    </form>
  );
}

function NowCapture({ adminRoute, apiRoute, initialFocus }: CardProps & { initialFocus: string }) {
  const [focusText, setFocusText] = useState(initialFocus);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = buildNowUpdateBody(focusText);

    if (!body || busy) {
      return;
    }

    setBusy(true);
    setNote(null);
    const result = await postJson(`${apiRoute}/globals/now-page`, body);
    setBusy(false);

    if (result.ok) {
      setNote({
        tone: "ok",
        text: "Now page updated.",
        href: `${adminRoute}/globals/now-page`,
        hrefLabel: "Edit the other Now fields"
      });
      return;
    }

    setNote({
      tone: "error",
      text: payloadErrorMessage(result.json, "Could not update the Now page. Try again.")
    });
  };

  return (
    <form className={styles.captureCard} onSubmit={submit}>
      <span className={styles.captureKicker}>Now</span>
      <div className={styles.captureFields}>
        <textarea
          aria-label="Current focus for the Now page"
          className={`${styles.captureInput} ${styles.captureTextarea}`}
          onChange={(event) => setFocusText(event.target.value)}
          placeholder="What are you focused on right now?"
          rows={2}
          value={focusText}
        />
      </div>
      <button
        className={styles.captureSubmit}
        disabled={busy || !focusText.trim() || focusText === initialFocus}
        type="submit"
      >
        {busy ? "Saving…" : "Update Now page"}
      </button>
      <CaptureNote note={note} />
    </form>
  );
}

function BookCapture({ adminRoute, apiRoute }: CardProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = buildBookBody(title, author);

    if (!body || busy) {
      return;
    }

    setBusy(true);
    setNote(null);
    const result = await postJson(`${apiRoute}/books`, body);
    setBusy(false);

    const id = result.json?.doc?.id;

    if (result.ok && id != null) {
      setTitle("");
      setAuthor("");
      setNote({
        tone: "ok",
        text: `“${body.title}” is on the shelf.`,
        href: documentEditHref(adminRoute, "books", id),
        hrefLabel: "Add details"
      });
      return;
    }

    setNote({
      tone: "error",
      text: payloadErrorMessage(result.json, "Could not add the book. Try again.")
    });
  };

  return (
    <form className={styles.captureCard} onSubmit={submit}>
      <span className={styles.captureKicker}>Bookshelf</span>
      <div className={styles.captureFields}>
        <input
          aria-label="Book title"
          className={styles.captureInput}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Book title…"
          type="text"
          value={title}
        />
        <input
          aria-label="Book author"
          className={styles.captureInput}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Author…"
          type="text"
          value={author}
        />
      </div>
      <button
        className={styles.captureSubmit}
        disabled={busy || !title.trim() || !author.trim()}
        type="submit"
      >
        {busy ? "Adding…" : "Add book"}
      </button>
      <CaptureNote note={note} />
    </form>
  );
}

type UploadItem = {
  key: string;
  name: string;
  state: "uploading" | "done" | "error";
  message?: string;
  href?: string;
};

function ImageCapture({ adminRoute, apiRoute }: CardProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const key = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const gate = validateQuickImage(file);

      if (gate !== true) {
        setItems((prev) => [...prev, { key, name: file.name, state: "error", message: gate }]);
        continue;
      }

      setItems((prev) => [...prev, { key, name: file.name, state: "uploading" }]);
      const data = new FormData();
      data.append("file", file);
      const res = await fetch(`${apiRoute}/media`, { method: "POST", body: data });
      const json = (await res.json().catch(() => null)) as { doc?: { id?: number | string } } | null;
      const id = json?.doc?.id;

      setItems((prev) =>
        prev.map((item) => {
          if (item.key !== key) {
            return item;
          }

          return res.ok && id != null
            ? {
                key,
                name: file.name,
                state: "done" as const,
                href: documentEditHref(adminRoute, "media", id)
              }
            : {
                key,
                name: file.name,
                state: "error" as const,
                message: payloadErrorMessage(json, "Upload failed. Try again.")
              };
        })
      );
    }
  };

  return (
    <div className={styles.captureCard}>
      <span className={styles.captureKicker}>Images</span>
      <div className={styles.captureFields}>
        <label
          className={styles.captureDrop}
          data-active={dragActive ? "true" : "false"}
          htmlFor="quick-capture-images"
          onDragLeave={() => setDragActive(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            void handleFiles(event.dataTransfer.files);
          }}
        >
          Drop images here, or browse. New images join the alt-text queue.
        </label>
      </div>
      <input
        accept={quickImageMimeTypes.join(",")}
        className={styles.captureDropInput}
        id="quick-capture-images"
        multiple
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            void handleFiles(event.target.files);
          }
          event.target.value = "";
        }}
        type="file"
      />
      {items.length > 0 ? (
        <ul className={styles.captureList}>
          {items.map((item) => (
            <li key={item.key} data-tone={item.state === "error" ? "error" : "ok"}>
              {item.state === "uploading" ? `Uploading ${item.name}…` : null}
              {item.state === "done" ? (
                <>
                  {item.name} uploaded. <a href={item.href}>Add alt text</a>
                </>
              ) : null}
              {item.state === "error" ? item.message : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type QuickCaptureProps = {
  adminRoute: string;
  apiRoute: string;
  nowCurrentFocus: string;
};

export function QuickCapture({ adminRoute, apiRoute, nowCurrentFocus }: QuickCaptureProps) {
  return (
    <div className={styles.capture}>
      <PostCapture adminRoute={adminRoute} apiRoute={apiRoute} />
      <NowCapture adminRoute={adminRoute} apiRoute={apiRoute} initialFocus={nowCurrentFocus} />
      <ImageCapture adminRoute={adminRoute} apiRoute={apiRoute} />
      <BookCapture adminRoute={adminRoute} apiRoute={apiRoute} />
    </div>
  );
}
