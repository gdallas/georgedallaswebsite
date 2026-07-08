import { estimateReadingTime, validatePublishingState } from "../validation/content.mjs";

// Publishing beforeChange logic as a factory so the error class is injectable
// for unit tests. Validation failures must be thrown as Payload's APIError with
// a 400 status and isPublic=true — a plain Error surfaces to the admin as a raw
// 500 "Something went wrong" with the reason hidden (the GDW-062 lesson, the
// same one the media hook already learned). This is what tells the writer they
// still need a publish date, an excerpt, or the SEO fields before going live.
/**
 * @param {object} options
 * @param {typeof import("payload").APIError} options.APIError
 * @param {boolean} [options.computeReadingTime]
 * @param {string[]} [options.requiredMetadata]
 * @returns {import("payload").CollectionBeforeChangeHook}
 */
export function createPublishingBeforeChangeHook({ APIError, computeReadingTime = false, requiredMetadata }) {
  return ({ data, originalDoc }) => {
    const effectiveData = {
      status: "draft",
      visibility: "private",
      ...(originalDoc ?? {}),
      ...data
    };
    const validation = validatePublishingState(effectiveData, { requiredMetadata });

    if (validation !== true) {
      throw new APIError(validation, 400, null, true);
    }

    if (computeReadingTime) {
      data.readingTime = estimateReadingTime(effectiveData);
    }

    return data;
  };
}
