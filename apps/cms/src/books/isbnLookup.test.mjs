import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGoogleBooksUrl,
  buildOpenLibraryUrl,
  isValidIsbn,
  lookupIsbn,
  normalizeIsbn,
  parseGoogleBooks,
  parseOpenLibrary
} from "./isbnLookup.mjs";

describe("normalizeIsbn", () => {
  it("strips spaces and hyphens and upper-cases the check digit", () => {
    assert.equal(normalizeIsbn("0-306-40615-x"), "030640615X");
    assert.equal(normalizeIsbn("978 0 14 032872 1"), "9780140328721");
  });
});

describe("isValidIsbn", () => {
  it("accepts valid ISBN-13 and ISBN-10 (including an X check digit)", () => {
    assert.equal(isValidIsbn("9780140328721"), true);
    assert.equal(isValidIsbn("0-306-40615-2"), true);
    assert.equal(isValidIsbn("080442957X"), true);
  });

  it("rejects bad checksums, wrong lengths, and junk", () => {
    assert.equal(isValidIsbn("9780140328722"), false); // last digit off by one
    assert.equal(isValidIsbn("0306406153"), false); // bad ISBN-10 checksum
    assert.equal(isValidIsbn("12345"), false);
    assert.equal(isValidIsbn(""), false);
    assert.equal(isValidIsbn("978014032872X"), false); // X only valid in ISBN-10
  });
});

describe("URL builders", () => {
  it("target the keyless, CORS-open endpoints", () => {
    assert.equal(
      buildOpenLibraryUrl("9780140328721"),
      "https://openlibrary.org/api/books?bibkeys=ISBN:9780140328721&format=json&jscmd=data"
    );
    assert.equal(buildGoogleBooksUrl("9780140328721"), "https://www.googleapis.com/books/v1/volumes?q=isbn:9780140328721");
  });
});

describe("parseOpenLibrary", () => {
  const json = {
    "ISBN:9780140328721": {
      title: "Fantastic Mr. Fox",
      authors: [{ name: "Roald Dahl", url: "x" }],
      cover: {
        small: "http://covers.openlibrary.org/b/id/1-S.jpg",
        medium: "http://covers.openlibrary.org/b/id/1-M.jpg",
        large: "http://covers.openlibrary.org/b/id/1-L.jpg"
      },
      publish_date: "October 1, 1988",
      number_of_pages: 96
    }
  };

  it("maps the record to editable fields and upgrades the cover to https", () => {
    const book = parseOpenLibrary(json, "9780140328721");
    assert.equal(book.title, "Fantastic Mr. Fox");
    assert.equal(book.author, "Roald Dahl");
    assert.equal(book.coverUrl, "https://covers.openlibrary.org/b/id/1-L.jpg");
    assert.equal(book.publishYear, 1988);
    assert.equal(book.pageCount, 96);
    assert.equal(book.source, "Open Library");
  });

  it("returns null when the ISBN key is absent or has no title", () => {
    assert.equal(parseOpenLibrary({}, "9780140328721"), null);
    assert.equal(parseOpenLibrary({ "ISBN:9780140328721": { authors: [] } }, "9780140328721"), null);
  });

  it("appends a subtitle to the title when present", () => {
    const withSub = { "ISBN:9780000000002": { title: "Main", subtitle: "The Sequel" } };
    assert.equal(parseOpenLibrary(withSub, "9780000000002").title, "Main: The Sequel");
  });
});

describe("parseGoogleBooks", () => {
  it("maps the first volume and joins multiple authors", () => {
    const json = {
      totalItems: 1,
      items: [
        {
          volumeInfo: {
            title: "Some Book",
            authors: ["Ada Lovelace", "Alan Turing"],
            publishedDate: "1953-06",
            pageCount: 210,
            imageLinks: { thumbnail: "http://books.google.com/x?zoom=1" }
          }
        }
      ]
    };
    const book = parseGoogleBooks(json);
    assert.equal(book.author, "Ada Lovelace, Alan Turing");
    assert.equal(book.publishYear, 1953);
    assert.equal(book.coverUrl, "https://books.google.com/x?zoom=1");
    assert.equal(book.source, "Google Books");
  });

  it("returns null when there are no items", () => {
    assert.equal(parseGoogleBooks({ totalItems: 0, items: [] }), null);
  });
});

describe("lookupIsbn", () => {
  const olResponse = {
    "ISBN:9780140328721": { title: "Fantastic Mr. Fox", authors: [{ name: "Roald Dahl" }] }
  };

  it("short-circuits an invalid ISBN with no request", async () => {
    let called = false;
    const result = await lookupIsbn({
      isbn: "12345",
      fetchImpl: async () => {
        called = true;
        return { ok: true, json: async () => ({}) };
      }
    });
    assert.equal(called, false);
    assert.deepEqual(result, { ok: false, reason: "invalid", isbn: "12345" });
  });

  it("returns the Open Library match with the normalized isbn attached", async () => {
    const result = await lookupIsbn({
      isbn: "978-0-14-032872-1",
      fetchImpl: async () => ({ ok: true, json: async () => olResponse })
    });
    assert.equal(result.ok, true);
    assert.equal(result.book.title, "Fantastic Mr. Fox");
    assert.equal(result.book.isbn, "9780140328721");
  });

  it("falls back to Google Books when Open Library has nothing", async () => {
    const googleResponse = { items: [{ volumeInfo: { title: "From Google", authors: ["Someone"] } }] };
    let call = 0;
    const result = await lookupIsbn({
      isbn: "9780140328721",
      fetchImpl: async () => {
        call += 1;
        return { ok: true, json: async () => (call === 1 ? {} : googleResponse) };
      }
    });
    assert.equal(result.ok, true);
    assert.equal(result.book.title, "From Google");
    assert.equal(result.book.source, "Google Books");
  });

  it("reports not-found when neither source matches", async () => {
    const result = await lookupIsbn({
      isbn: "9780140328721",
      fetchImpl: async () => ({ ok: true, json: async () => ({}) })
    });
    assert.deepEqual(result, { ok: false, reason: "notfound", isbn: "9780140328721" });
  });

  it("reports a network error without throwing", async () => {
    const result = await lookupIsbn({
      isbn: "9780140328721",
      fetchImpl: async () => {
        throw new Error("offline");
      }
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "error");
  });

  it("distinguishes an aborted lookup", async () => {
    const result = await lookupIsbn({
      isbn: "9780140328721",
      fetchImpl: async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
    });
    assert.equal(result.reason, "aborted");
  });
});
