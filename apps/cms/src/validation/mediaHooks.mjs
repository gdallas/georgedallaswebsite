import {
  buildMediaStorageKey,
  initialMediaReviewStatus,
  validateMediaFileMetadata
} from "./content.mjs";

// Media beforeChange logic as a factory so the error class is injectable for
// unit tests. Validation failures must be thrown as Payload's APIError with a
// 400 status and isPublic=true — a plain Error surfaces to the admin as a raw
// 500 with the message hidden (the GDW-062 lesson).
export function createMediaBeforeChangeHook({ APIError }) {
  return ({ data = {}, operation }) => {
    const validation = validateMediaFileMetadata(data);

    if (validation !== true) {
      throw new APIError(validation, 400, null, true);
    }

    if (data.filename) {
      data.storageKey = buildMediaStorageKey("uploads", data.prefix, data.filename);
    }

    // New images without alt text go straight into the needs-alt-text queue
    // so the dashboard surfaces them right away (GDW-057).
    if (operation === "create") {
      data.reviewStatus = initialMediaReviewStatus(data);
    }

    return data;
  };
}
