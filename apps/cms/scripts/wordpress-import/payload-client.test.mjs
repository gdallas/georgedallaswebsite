import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPayloadClient } from "./payload-client.mjs";

function response({ ok = true, status = 200, body = {}, setCookies = [] } = {}) {
  return {
    ok,
    status,
    headers: {
      getSetCookie: () => setCookies,
      get: (name) => (name.toLowerCase() === "set-cookie" ? (setCookies[0] ?? null) : null)
    },
    json: async () => body
  };
}

describe("createPayloadClient", () => {
  it("lifts the JWT out of the login cookie and sends it as a bearer token", async () => {
    // Payload v3 returns no body token, only an httpOnly Set-Cookie.
    const calls = [];
    const fetchImpl = async (url, init = {}) => {
      calls.push({ url, init });
      if (url.endsWith("/api/users/login")) {
        return response({
          body: { message: "Authentication Passed" },
          setCookies: ["gdw-development-token=JWT123; Path=/; HttpOnly=true; SameSite=Lax"]
        });
      }
      if ((init.method ?? "GET") === "GET") {
        return response({ body: { docs: [] } });
      }
      return response({ body: { doc: { id: 7 } } });
    };

    const client = createPayloadClient({ cmsUrl: "https://cms.example", email: "e", password: "p", fetchImpl });
    await client.login();
    await client.findByWordpressId("821");
    const created = await client.createDraft({ title: "x" });

    assert.equal(created.id, 7);
    for (const call of calls.filter((c) => c.url.includes("/api/posts"))) {
      assert.equal(call.init.headers.Authorization, "JWT JWT123");
    }
  });

  it("percent-encodes the where-clause brackets in lookups", async () => {
    let lookupUrl = "";
    const fetchImpl = async (url, init = {}) => {
      if (url.endsWith("/api/users/login")) {
        return response({ body: { token: "T" } });
      }
      lookupUrl = url;
      return response({ body: { docs: [] } });
    };

    const client = createPayloadClient({ cmsUrl: "https://cms.example", email: "e", password: "p", fetchImpl });
    await client.login();
    await client.findByWordpressId("821");

    assert.match(lookupUrl, /where%5BwordpressOriginalId%5D%5Bequals%5D=821/);
    assert.ok(!lookupUrl.includes("where["), "raw brackets must be encoded for CloudFront/Payload");
  });

  it("prefers a body token when the CMS returns one", async () => {
    let auth = null;
    const fetchImpl = async (url, init = {}) => {
      if (url.endsWith("/api/users/login")) {
        return response({ body: { token: "BODYTOK" } });
      }
      auth = init.headers.Authorization;
      return response({ body: { docs: [] } });
    };

    const client = createPayloadClient({ cmsUrl: "https://cms.example", email: "e", password: "p", fetchImpl });
    await client.login();
    await client.findByWordpressId("1");
    assert.equal(auth, "JWT BODYTOK");
  });

  it("throws when login returns neither a token nor an auth cookie", async () => {
    const fetchImpl = async (url) => (url.endsWith("/login") ? response({ body: {} }) : response());
    const client = createPayloadClient({ cmsUrl: "https://cms.example", email: "e", password: "p", fetchImpl });
    await assert.rejects(client.login(), /neither a body token nor an auth cookie/);
  });

  it("surfaces create errors with their detail", async () => {
    const fetchImpl = async (url) => {
      if (url.endsWith("/api/users/login")) {
        return response({ body: { token: "T" } });
      }
      return response({ ok: false, status: 403, body: { errors: [{ message: "You are not allowed to perform this action." }] } });
    };
    const client = createPayloadClient({ cmsUrl: "https://cms.example", email: "e", password: "p", fetchImpl });
    await client.login();
    await assert.rejects(client.createDraft({ title: "x" }), /not allowed to perform this action/);
  });
});
