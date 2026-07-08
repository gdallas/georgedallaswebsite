"use client";

import { useEffect, useRef, useState } from "react";
import { isValidIsbn, lookupIsbn, normalizeIsbn } from "./isbnLookup.mjs";

export type IsbnBook = {
  title: string;
  author: string | null;
  isbn: string;
  coverUrl: string | null;
  publishYear: number | null;
  pageCount: number | null;
  source: string;
};

export type IsbnLookupStatus = "idle" | "invalid" | "looking" | "found" | "notfound" | "error";

type IsbnLookupState = { status: IsbnLookupStatus; book: IsbnBook | null; isbn: string };

// Debounced, self-cancelling ISBN lookup for the admin browser. Fires only once
// the typed value is a checksum-valid ISBN, cancels an in-flight request when
// the value changes, and never throws — a failure just lands in `status`.
export function useIsbnLookup(rawIsbn: string, debounceMs = 500): IsbnLookupState {
  const [state, setState] = useState<IsbnLookupState>({ status: "idle", book: null, isbn: "" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const normalized = normalizeIsbn(rawIsbn);

    if (normalized.length === 0) {
      setState({ status: "idle", book: null, isbn: "" });
      return;
    }

    if (!isValidIsbn(normalized)) {
      setState({ status: "invalid", book: null, isbn: normalized });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ status: "looking", book: null, isbn: normalized });

      const result = await lookupIsbn({ isbn: normalized, signal: controller.signal });
      if (cancelled) {
        return;
      }

      if (result.ok) {
        setState({ status: "found", book: result.book as IsbnBook, isbn: normalized });
      } else if (result.reason === "notfound") {
        setState({ status: "notfound", book: null, isbn: normalized });
      } else if (result.reason === "aborted") {
        // Superseded by a newer keystroke; the newer run owns the state.
      } else {
        setState({ status: "error", book: null, isbn: normalized });
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rawIsbn, debounceMs]);

  return state;
}
