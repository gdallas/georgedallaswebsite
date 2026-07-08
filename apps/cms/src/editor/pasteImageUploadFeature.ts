import { createServerFeature } from "@payloadcms/richtext-lexical";

// Registers the client-only paste handler in editor/PasteImageUploadFeatureClient.tsx.
// There is no server-side node or conversion here — it reuses the media
// collection and the UploadNode that the default UploadFeature already
// provides; it only needs to reach the browser through the import map.
export const pasteImageUploadFeature = createServerFeature({
  feature: {
    ClientFeature: "/editor/PasteImageUploadFeatureClient#PasteImageUploadFeatureClient"
  },
  key: "pasteImageUpload"
});
