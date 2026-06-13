// Fetches posts from a WordPress REST API, handling pagination. The HTTP client
// is injectable so the pagination logic can be unit-tested without a network.

export async function fetchWordpressPosts(options = {}) {
  const { apiBase, perPage = 10, limit = 10, embed = true, fetchImpl = fetch } = options;

  if (!apiBase) {
    throw new Error("apiBase is required (e.g. https://example.com/wp-json).");
  }

  const base = String(apiBase).replace(/\/+$/, "");
  const pageSize = Math.min(Math.max(perPage, 1), 100);
  const collected = [];
  let page = 1;

  while (collected.length < limit) {
    const url = `${base}/wp/v2/posts?per_page=${pageSize}&page=${page}${embed ? "&_embed=1" : ""}`;
    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });

    // WordPress returns 400 (rest_post_invalid_page_number) when paging past the
    // end — that is the normal "no more pages" signal, not an error.
    if (response.status === 400) {
      break;
    }
    if (!response.ok) {
      throw new Error(`WordPress API returned HTTP ${response.status} for ${url}.`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    collected.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    page += 1;
  }

  return collected.slice(0, limit);
}
