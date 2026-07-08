// ISBN lookup for the bookshelf (GDW-046). The CMS Lambda has no internet
// egress, so this runs in the admin browser: normalize + checksum-validate the
// ISBN, then query Open Library (keyless, CORS-open) and fall back to Google
// Books. Everything here is pure and fetch-injected so it stays unit-testable;
// the admin components (Books edit field, dashboard capture) own the debounce,
// the network, and applying suggestions. A failed lookup never blocks manual
// entry — it only offers to fill fields.

// Strip separators and normalise the check digit. ISBN-10 may end in 'X'.
export function normalizeIsbn(input) {
  return String(input ?? "")
    .replace(/[\s-]/g, "")
    .toUpperCase();
}

export function isValidIsbn(input) {
  const isbn = normalizeIsbn(input);
  return isValidIsbn10(isbn) || isValidIsbn13(isbn);
}

function isValidIsbn10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const char = isbn[i];
    const value = char === "X" ? 10 : Number(char);
    sum += value * (10 - i);
  }

  return sum % 11 === 0;
}

function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }

  return sum % 10 === 0;
}

export function buildOpenLibraryUrl(isbn) {
  return `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
}

export function buildGoogleBooksUrl(isbn) {
  return `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`;
}

// Pull the first 4-digit year out of a free-form date ("October 1, 1988",
// "1988-10-01", "1988"); returns null when there is no plausible year.
function extractYear(value) {
  const match = /\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/.exec(String(value ?? ""));
  return match ? Number(match[1]) : null;
}

function cleanText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

// Force the largest, https cover the source will give us. Open Library returns
// sized variants; Google returns an http thumbnail with a zoom parameter.
function preferHttps(url) {
  const cleaned = cleanText(url);
  return cleaned ? cleaned.replace(/^http:\/\//i, "https://") : null;
}

export function parseOpenLibrary(json, isbn) {
  const record = json?.[`ISBN:${normalizeIsbn(isbn)}`];
  if (!record) {
    return null;
  }

  const title = cleanText(record.title);
  if (!title) {
    return null;
  }

  const author = Array.isArray(record.authors)
    ? record.authors
        .map((entry) => cleanText(entry?.name))
        .filter(Boolean)
        .join(", ")
    : "";

  return {
    title: record.subtitle ? `${title}: ${cleanText(record.subtitle)}` : title,
    author: author || null,
    coverUrl: preferHttps(record.cover?.large || record.cover?.medium || record.cover?.small),
    publishYear: extractYear(record.publish_date),
    pageCount: typeof record.number_of_pages === "number" ? record.number_of_pages : null,
    source: "Open Library"
  };
}

export function parseGoogleBooks(json) {
  const info = json?.items?.[0]?.volumeInfo;
  const title = cleanText(info?.title);
  if (!title) {
    return null;
  }

  const author = Array.isArray(info.authors)
    ? info.authors.map((name) => cleanText(name)).filter(Boolean).join(", ")
    : "";

  return {
    title: info.subtitle ? `${title}: ${cleanText(info.subtitle)}` : title,
    author: author || null,
    coverUrl: preferHttps(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail),
    publishYear: extractYear(info.publishedDate),
    pageCount: typeof info.pageCount === "number" ? info.pageCount : null,
    source: "Google Books"
  };
}

async function fetchJson(url, fetchImpl, signal) {
  const res = await fetchImpl(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    return null;
  }
  return res.json().catch(() => null);
}

// Looks up one ISBN. Returns a discriminated result so callers can tell an
// invalid ISBN (no request worth sending) from a not-found or a network error.
export async function lookupIsbn({ isbn, fetchImpl, signal } = {}) {
  const normalized = normalizeIsbn(isbn);

  if (!isValidIsbn(normalized)) {
    return { ok: false, reason: "invalid", isbn: normalized };
  }

  const doFetch = fetchImpl ?? globalThis.fetch;

  try {
    const openLibrary = await fetchJson(buildOpenLibraryUrl(normalized), doFetch, signal);
    const fromOpenLibrary = openLibrary ? parseOpenLibrary(openLibrary, normalized) : null;
    if (fromOpenLibrary) {
      return { ok: true, isbn: normalized, book: { ...fromOpenLibrary, isbn: normalized } };
    }

    const google = await fetchJson(buildGoogleBooksUrl(normalized), doFetch, signal);
    const fromGoogle = google ? parseGoogleBooks(google) : null;
    if (fromGoogle) {
      return { ok: true, isbn: normalized, book: { ...fromGoogle, isbn: normalized } };
    }

    return { ok: false, reason: "notfound", isbn: normalized };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, reason: "aborted", isbn: normalized };
    }
    return { ok: false, reason: "error", isbn: normalized };
  }
}
