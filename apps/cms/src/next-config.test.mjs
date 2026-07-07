import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nextConfig from "../next.config.mjs";

describe("CMS Next config", () => {
  it("allows deployed CMS origins for server actions behind CloudFront", () => {
    const serverActions = nextConfig.experimental?.serverActions;

    assert.equal(serverActions?.bodySizeLimit, "6mb");
    assert.deepEqual(serverActions?.allowedOrigins?.sort(), ["cms-dev.georgedallas.com", "cms.georgedallas.com"]);
  });
});
