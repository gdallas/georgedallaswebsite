import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loadCmsConfig } from "../env";
import { decideMarkers, markerKey } from "../publishing/markers.mjs";

type CmsConfig = ReturnType<typeof loadCmsConfig>;
type MarkerKind = "dated" | "listing";

// The CMS Lambda runs in an isolated subnet with only an S3 gateway endpoint, so
// it cannot call GitHub/EventBridge directly. Instead it drops a small JSON
// marker in the control bucket; an S3 event triggers the publishing worker which
// has internet access (GDW-035). Signalling must never break a content save, so
// every failure here is logged and swallowed.

let cachedClient: S3Client | undefined;

function controlClient(config: CmsConfig): S3Client {
  if (!cachedClient) {
    const credentials =
      config.s3.accessKeyId && config.s3.secretAccessKey
        ? { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey }
        : undefined;
    cachedClient = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      forcePathStyle: Boolean(config.s3.endpoint),
      credentials
    });
  }
  return cachedClient;
}

async function emitMarkers(
  req: PayloadRequest,
  args: { kind: MarkerKind; collection: string; doc?: unknown; previousDoc?: unknown; operation: "change" | "delete" }
): Promise<void> {
  const config = loadCmsConfig();
  const control = config.publishControl;
  if (!control) {
    // Local dev / unconfigured environments: nothing to signal.
    return;
  }

  const markers = decideMarkers(args as never);
  if (markers.length === 0) {
    return;
  }

  const client = controlClient(config);
  await Promise.all(
    markers.map(async (marker) => {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: control.bucket,
            Key: markerKey(control.prefix, marker as never),
            Body: JSON.stringify(marker),
            ContentType: "application/json"
          })
        );
      } catch (error) {
        req.payload.logger.error(
          { err: error, marker },
          "Failed to write publishing control marker; site rebuild/schedule may be delayed."
        );
      }
    })
  );
}

export function publishSignalsAfterChange(collectionSlug: string, kind: MarkerKind = "dated"): CollectionAfterChangeHook {
  return async ({ doc, previousDoc, req }) => {
    await emitMarkers(req, { kind, collection: collectionSlug, doc, previousDoc, operation: "change" });
    return doc;
  };
}

export function publishSignalsAfterDelete(collectionSlug: string, kind: MarkerKind = "dated"): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    await emitMarkers(req, { kind, collection: collectionSlug, doc, operation: "delete" });
    return doc;
  };
}
