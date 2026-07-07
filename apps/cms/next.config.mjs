import path from "node:path";
import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the Lambda container image small (see the CMS
  // Lambda hosting ADR). The tracing root makes standalone work in the
  // pnpm monorepo.
  output: "standalone",
  outputFileTracingRoot: path.resolve(dirname, "..", ".."),
  experimental: {
    serverActions: {
      // CloudFront cannot forward the real Host header to a Lambda Function
      // URL origin, so Next sees Origin (cms[-dev].georgedallas.com) !=
      // Host (….lambda-url…) and rejects every Server Action with a 500
      // ("Invalid Server Actions request") — which broke Payload's
      // server-function flows such as the editor's bulk-upload drawer
      // (GDW-062). Hosts are listed statically because the image is built
      // once with placeholder env and deployed to both environments; local
      // dev is same-origin and needs no entry. next-config.test.mjs pins
      // this list.
      allowedOrigins: ["cms-dev.georgedallas.com", "cms.georgedallas.com"],
      // Server Actions default to a 1 MB body; the bulk-upload drawer moves
      // files through them, so give the 4 MB media cap (GDW-057) headroom
      // for multipart overhead.
      bodySizeLimit: "6mb"
    }
  }
};

export default withPayload(nextConfig);
