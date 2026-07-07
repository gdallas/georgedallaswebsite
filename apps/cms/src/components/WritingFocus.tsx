"use client";

import { useFormFields, useFormModified } from "@payloadcms/ui";
import { useEffect, useState } from "react";
import { countLexicalWords, statusLineText } from "../editor/writingStats.mjs";

// Focus writing view (GDW-060): the quiet status line under the body editor
// (saved state + live word count) and the Focus toggle. Focus mode is pure
// CSS — this component only stamps `data-gdw-focus` on <html> and custom.css
// hides the chrome — so Payload's form lifecycle (saves, versions,
// validation, the publishing triad) is untouched by construction.

const STORAGE_KEY = "gdw-writing-focus";

export function WritingFocus() {
  const modified = useFormModified();
  const body = useFormFields(([fields]) => fields?.body?.value);
  // SSR renders no focus state; the stored preference (default: on, per the
  // ticket's "opening a post lands in the focus surface") applies on mount.
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    setFocus(window.localStorage.getItem(STORAGE_KEY) !== "off");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.gdwFocus = focus ? "on" : "off";

    return () => {
      delete document.documentElement.dataset.gdwFocus;
    };
  }, [focus]);

  const toggle = () => {
    setFocus((current) => {
      window.localStorage.setItem(STORAGE_KEY, current ? "off" : "on");
      return !current;
    });
  };

  const words = countLexicalWords(body as Parameters<typeof countLexicalWords>[0]);

  return (
    <div className="gdw-writing-line">
      <span aria-live="polite" className="gdw-writing-line__status">
        {statusLineText({ modified, words })}
      </span>
      <button
        aria-pressed={focus}
        className="gdw-writing-line__toggle"
        onClick={toggle}
        type="button"
      >
        {focus ? "Exit focus" : "Focus"}
      </button>
    </div>
  );
}
