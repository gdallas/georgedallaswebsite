import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchWordpressPosts } from "./fetch.mjs";

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function pagedFetch(pages) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const page = Number(new URL(url).searchParams.get("page"));
    const body = pages[page - 1];
    if (body === undefined) {
      return jsonResponse({ code: "rest_post_invalid_page_number" }, 400);
    }
    return jsonResponse(body);
  };
  return { fetchImpl, calls };
}

describe("fetchWordpressPosts", () => {
  it("paginates until the limit is reached", async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const page2 = Array.from({ length: 10 }, (_, i) => ({ id: i + 11 }));
    const { fetchImpl, calls } = pagedFetch([page1, page2]);

    const posts = await fetchWordpressPosts({ apiBase: "https://blog.example.com/wp-json/wp/v2", perPage: 10, limit: 15, fetchImpl });
    assert.equal(posts.length, 15);
    assert.equal(calls.length, 2);
    assert.match(calls[0], /per_page=10&page=1/);
    assert.match(calls[0], /_embed=1/);
  });

  it("stops when a short page signals the end", async () => {
    const { fetchImpl, calls } = pagedFetch([[{ id: 1 }, { id: 2 }]]);
    const posts = await fetchWordpressPosts({ apiBase: "https://blog.example.com/wp-json/wp/v2", perPage: 10, limit: 50, fetchImpl });
    assert.equal(posts.length, 2);
    assert.equal(calls.length, 1);
  });

  it("treats a 400 on the next page as the end of results", async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const { fetchImpl } = pagedFetch([page1]);
    const posts = await fetchWordpressPosts({ apiBase: "https://blog.example.com/wp-json/wp/v2", perPage: 10, limit: 50, fetchImpl });
    assert.equal(posts.length, 10);
  });

  it("throws on a non-400 error response", async () => {
    const fetchImpl = async () => jsonResponse({}, 500);
    await assert.rejects(
      fetchWordpressPosts({ apiBase: "https://blog.example.com/wp-json/wp/v2", fetchImpl }),
      /HTTP 500/
    );
  });

  it("requires an apiBase", async () => {
    await assert.rejects(fetchWordpressPosts({}), /apiBase is required/);
  });
});
