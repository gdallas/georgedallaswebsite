import type { CollectionBeforeChangeHook } from "payload";
import { estimateReadingTime, validatePublishingState } from "../validation/content.mjs";

type PublishingHookOptions = {
  computeReadingTime?: boolean;
  requiredMetadata?: string[];
};

export function createPublishingBeforeChangeHook(options: PublishingHookOptions = {}): CollectionBeforeChangeHook {
  return ({ data, originalDoc }) => {
    const effectiveData = {
      status: "draft",
      visibility: "private",
      ...(originalDoc ?? {}),
      ...data
    };
    const validation = validatePublishingState(effectiveData, {
      requiredMetadata: options.requiredMetadata
    });

    if (validation !== true) {
      throw new Error(validation);
    }

    if (options.computeReadingTime) {
      data.readingTime = estimateReadingTime(effectiveData);
    }

    return data;
  };
}
