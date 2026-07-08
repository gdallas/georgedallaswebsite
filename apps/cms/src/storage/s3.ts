import { s3Storage } from "@payloadcms/storage-s3";
import type { loadCmsConfig } from "../env";
import { buildMediaPublicUrl } from "../validation/content.mjs";

type CmsConfig = ReturnType<typeof loadCmsConfig>;

export function createMediaStoragePlugin(config: CmsConfig) {
  const credentials =
    config.s3.accessKeyId && config.s3.secretAccessKey
      ? {
          accessKeyId: config.s3.accessKeyId,
          secretAccessKey: config.s3.secretAccessKey
        }
      : undefined;

  return s3Storage({
    acl: "private",
    bucket: config.s3.bucket,
    // Browser uploads straight to S3 with a presigned URL so files up to the
    // 10 MB cap never hit the Lambda Function URL's ~6 MB event limit (George,
    // 2026-07-08). The media bucket CORS must allow PUT from the admin origin
    // (infra/src/media-foundation.mjs). Only the file bytes bypass the app; the
    // media doc + validation still run server-side.
    clientUploads: true,
    collections: {
      media: {
        generateFileURL: ({ filename, prefix }) => {
          return buildMediaPublicUrl(config.s3.publicUrl, "uploads", prefix, filename);
        },
        prefix: "uploads"
      }
    },
    config: {
      credentials,
      endpoint: config.s3.endpoint,
      forcePathStyle: Boolean(config.s3.endpoint),
      region: config.s3.region
    },
    disableLocalStorage: true,
    useCompositePrefixes: true
  });
}
