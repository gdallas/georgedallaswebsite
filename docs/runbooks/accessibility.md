# Accessibility runbook

Accessibility is part of the definition of done for this site (see the README). The target is **WCAG 2.2 AA where practical**. This runbook is the manual review checklist; automation backs it up but does not replace it.

## What is automated

`apps/site/src/accessibility.test.mjs` runs in CI (via `pnpm test`) and statically guards the baseline:

- `<html lang>` is set, a skip link and `<main>` landmark exist.
- The global stylesheet defines `:focus-visible` states and honors `prefers-reduced-motion`.
- Every page renders inside `BaseLayout`.
- Every `<img>` has an `alt` attribute (empty for decorative).
- No positive `tabindex`, no inline `onclick` handlers (interactivity stays on native elements).
- Every new-tab (`target="_blank"`) link carries `rel="noopener"`.

These checks catch regressions cheaply. They do **not** verify contrast, reading order, screen-reader output, or real keyboard journeys — do those by hand.

## Manual review checklist (run before merging UI changes)

### Structure and semantics
- [ ] One `<h1>` per page; heading levels do not skip (h1 → h2 → h3).
- [ ] Landmarks present and correct: `header`, `nav`, `main`, `footer`.
- [ ] Lists use `ul`/`ol`/`li`; quotes use `blockquote`.

### Keyboard
- [ ] Every interactive element is reachable and operable with the keyboard alone.
- [ ] Focus order matches visual order; no keyboard traps.
- [ ] Focus is always visible (the `--focus-ring` box-shadow), including on dark surfaces.
- [ ] The skip link appears on first Tab and jumps to `#main`.

### Names and content
- [ ] Links have meaningful accessible names out of context (avoid bare "click here"; "Live"/"GitHub" are acceptable inside a titled project card).
- [ ] Images have descriptive `alt`, or `alt=""` when purely decorative (e.g. the logo, where the link itself carries the name).
- [ ] Form fields (when forms are added) have associated `<label>`s, descriptions, and accessible error messages.

### Visual
- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for large text); UI/border contrast ≥ 3:1 where practical.
- [ ] Layout is usable at 320px width and at 200% zoom.
- [ ] Animations and transitions are disabled under `prefers-reduced-motion: reduce`.

### Tools
- Browser DevTools accessibility pane / Lighthouse accessibility audit.
- An axe-based check (e.g. the axe DevTools extension) on each template.
- Manual keyboard pass (Tab/Shift-Tab/Enter/Space/Escape).
- A screen-reader spot check (VoiceOver, NVDA, or Narrator) on the home page and a post.

## Contrast audit (Cedar & Circuitry, dark theme)

Computed against the default dark palette. "Pass" = meets WCAG 2.2 AA for the size/weight in use.

| Foreground | Background | Ratio | Result |
| --- | --- | --- | --- |
| `--text` linen on `--background` | deep cedar | ~17:1 | Pass |
| `--text-muted` taupe on `--surface` | burnt umber | ~7.7:1 | Pass |
| `--link` cyan on `--background` | deep cedar | ~6.7:1 | Pass |
| `--accent` copper text on `--background` | deep cedar | ~5.4:1 | Pass |
| Linen text on **`--accent` copper button** | copper `#c47a45` | ~3.1:1 | **Fail** — fixed below |
| Linen text on **`--accent-strong` copper button** | copper-dark `#9d5730` | ~5.0:1 | Pass |

**Fix applied:** the primary button now fills with `--accent-strong` (a darker copper) instead of `--accent`, so light button text clears 4.5:1. This is a deliberate, in-palette darkening of the primary CTA; revert the `.cc-button--primary` background to `--accent` if the lighter copper is preferred and the contrast trade-off is accepted.

## Known follow-ups
- New-tab links do not announce that they open in a new tab; add a visually-hidden hint or icon when the link styling is revisited.
- A proper light-theme toggle is not yet shipped; the light palette tokens exist but are unexercised, so its contrast is not yet part of the audit.
