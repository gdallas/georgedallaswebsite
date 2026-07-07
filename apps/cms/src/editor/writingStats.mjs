// Pure helpers behind the focus writing view's status line (GDW-060): word
// counting over a Lexical editor state and the line's exact wording, kept out
// of the React component so both stay unit-testable.

export function countLexicalWords(editorState) {
  let words = 0;

  const walk = (node) => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (typeof node.text === "string") {
      const matches = node.text.match(/\S+/g);
      words += matches ? matches.length : 0;
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  walk(editorState?.root);

  return words;
}

export function statusLineText({ modified, words }) {
  const saveState = modified ? "Unsaved changes" : "Saved";
  return `${saveState} · ${words} ${words === 1 ? "word" : "words"}`;
}
