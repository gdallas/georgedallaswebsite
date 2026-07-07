import path from "node:path";
import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the Lambda container image small (see the CMS
  // Lambda hosting ADR). The tracing root makes standalone work in the
  // pnpm monorepo.
  experimental: {
    serverActions: {
      allowedOrigins: ["cms.georgedallas.com", "cms-dev.georgedallas.com"],
      bodySizeLimit: "6mb"
    }
  },
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
      // once with placeholder env and deployed to both environments.
      allowedOrigins: ["cms-dev.georgedallas.com", "cms.georgedallas.com", "localhost:3000"]
    }
  }
};

export default withPayload(nextConfig);
