import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countLexicalWords, statusLineText } from "./writingStats.mjs";

describe("countLexicalWords", () => {
  it("counts words across nested lexical nodes", () => {
    const state = {
      root: {
        children: [
          { type: "paragraph", children: [{ type: "text", text: "Cedar roots run deep." }] },
          {
            type: "quote",
            children: [
              { type: "text", text: "Two more" },
              { type: "text", text: " words here" }
            ]
          }
        ]
      }
    };
    assert.equal(countLexicalWords(state), 8);
  });

  it("ignores whitespace-only text and missing content", () => {
    assert.equal(countLexicalWords({ root: { children: [{ text: "   " }] } }), 0);
    assert.equal(countLexicalWords({ root: { children: [] } }), 0);
    assert.equal(countLexicalWords(undefined), 0);
    assert.equal(countLexicalWords({}), 0);
  });

  it("survives malformed nodes without throwing", () => {
    const state = {
      root: { children: [null, 42, { children: "not-an-array" }, { text: "one" }] }
    };
    assert.equal(countLexicalWords(state), 1);
  });
});

describe("statusLineText", () => {
  it("names the save state and pluralizes the count", () => {
    assert.equal(statusLineText({ modified: true, words: 1 }), "Unsaved changes · 1 word");
    assert.equal(statusLineText({ modified: false, words: 542 }), "Saved · 542 words");
    assert.equal(statusLineText({ modified: false, words: 0 }), "Saved · 0 words");
  });
});
