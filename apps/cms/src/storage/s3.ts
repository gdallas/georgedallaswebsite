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
    clientUploads: false,
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
