import { loadCmsConfig } from "../env";
import { buildPreviewUrl } from "./previewUrl.mjs";

// Payload `admin.preview` callback factory: turns the document being edited
// into a signed, tokenised preview URL. Returns null (no Preview button) if the
// doc is unsaved or the runtime config is unavailable, rather than crashing the
// admin view.
export function collectionPreview(collection: "posts" | "pages") {
  return (doc: { id?: string | number } | undefined | null): string | null => {
    try {
      const cms = loadCmsConfig();
      return buildPreviewUrl({
        collection,
        id: doc?.id,
        cmsPublicUrl: cms.cmsPublicUrl,
        secret: cms.sessionSecret
      });
    } catch {
      return null;
    }
  };
}
