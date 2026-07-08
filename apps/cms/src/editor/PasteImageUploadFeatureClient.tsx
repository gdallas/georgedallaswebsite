"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { $createUploadNode, createClientFeature } from "@payloadcms/richtext-lexical/client";
import { toast, useConfig } from "@payloadcms/ui";
import {
  $getPreviousSelection,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  PASTE_COMMAND
} from "lexical";
import { useEffect } from "react";
import { extractPastedImageFiles, newLexicalNodeId, uploadPastedImage } from "./pasteImageUpload.mjs";

// Intercepts pastes that carry image bytes and uploads them directly, so a
// pasted web image never becomes the pending node Payload can't resolve.
// Registered at CRITICAL priority so it wins over Payload's own PASTE handler
// (COMMAND_PRIORITY_LOW) whenever there is an image to claim; for every other
// paste it returns false and gets out of the way.
function PasteImageUploadPlugin() {
  const [editor] = useLexicalComposerContext();
  const { config } = useConfig();
  const mediaEndpoint = `${config.routes.api}/media`;

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!(event instanceof ClipboardEvent)) {
          return false;
        }

        const files = extractPastedImageFiles(event.clipboardData);
        if (files.length === 0) {
          return false;
        }

        // We own this paste now: stop the default handler from importing the
        // remote <img src> as a node that will hang on a CORS-blocked fetch.
        event.preventDefault();

        void (async () => {
          for (const file of files) {
            const { id, error } = await uploadPastedImage({ file, mediaEndpoint });

            if (id == null) {
              toast.error(error ?? "Could not add the pasted image.");
              continue;
            }

            editor.update(() => {
              const uploadNode = $createUploadNode({
                data: { id: newLexicalNodeId(), fields: {}, relationTo: "media", value: id }
              });
              const selection = $getSelection() ?? $getPreviousSelection();

              if ($isRangeSelection(selection)) {
                const focusNode = selection.focus.getNode();
                $insertNodeToNearestRoot(uploadNode);

                // Drop the empty paragraph the caret was sitting in, matching
                // how Payload's own upload plugin tidies up after an insert.
                if ($isParagraphNode(focusNode) && focusNode.getChildrenSize() === 0) {
                  focusNode.remove();
                }
              } else {
                $insertNodeToNearestRoot(uploadNode);
              }
            });
          }
        })();

        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, mediaEndpoint]);

  return null;
}

export const PasteImageUploadFeatureClient = createClientFeature({
  plugins: [{ Component: PasteImageUploadPlugin, position: "normal" }]
});
