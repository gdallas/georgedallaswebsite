# Codex Implementation Instructions — Cedar & Circuitry

## Purpose

Implement the selected **Cedar & Circuitry** visual identity across the George Dallas website. This is the approved direction from the design exploration. It should become the default design system for the public Astro site and should inform future CMS/admin polish.

The website requirements call for a personal, calm, credible, distinctive Pacific Northwest-inspired identity with clean typography, readability, subtle detail, dark mode preference, accessibility, strong cards, polished mobile, and a backend/admin that remains pleasant to use. The architecture also treats the admin/CMS as a core product, not an afterthought.

## Files provided

```text
apps/site/public/brand/cedar-circuitry-logo.svg
apps/site/public/brand/cedar-circuitry-mark.svg
apps/site/public/brand/cedar-circuitry-wordmark.svg
apps/site/public/brand/favicon.svg
apps/site/src/styles/tokens.css
apps/site/src/styles/cedar-circuitry.css
apps/site/src/components/brand/CedarCircuitryLogo.astro
apps/site/src/components/brand/BrandButton.astro
apps/site/src/components/brand/BrandCard.astro
apps/site/src/components/brand/StyleGuideHeroExample.astro
packages/shared/src/design/brandTokens.ts
packages/shared/src/design/brandTokens.json
docs/brand/cedar-circuitry-style-guide.md
docs/brand/cedar-circuitry-reference.png
```

## Required implementation approach

### 1. Import global styles once

When the Astro app is scaffolded, import this file exactly once from the root layout or global entrypoint:

```ts
import '../styles/cedar-circuitry.css';
```

Adjust the relative path if needed.

Do not duplicate these variables in page-level CSS.

### 2. Use tokenized colours only

All new public-site UI should use:

```css
var(--background)
var(--surface)
var(--surface-raised)
var(--text)
var(--text-strong)
var(--text-muted)
var(--border)
var(--accent)
var(--link)
var(--success)
```

Do not introduce one-off hex values unless:

1. the value is added to `tokens.css`,
2. the reason is documented in the PR, and
3. contrast is checked.

### 3. Install or load fonts deliberately

The CSS references:

- Fraunces
- IBM Plex Sans
- IBM Plex Mono

This kit does not include font files. Codex must not add random font CDNs without explicit approval. Preferred future implementation is self-hosted fonts or an approved privacy/performance-conscious font loading strategy.

Until fonts are properly loaded, the fallbacks are acceptable.

### 4. Use the cedar/circuit logo

Use:

```text
/brand/cedar-circuitry-mark.svg
```

for compact header/mobile/favicon-like contexts.

Use:

```text
/brand/cedar-circuitry-logo.svg
```

for footer, brand pages, style guide, and wide contexts.

Set the site favicon to:

```text
/brand/favicon.svg
```

### 5. Page implementation guidance

#### Header

- Use the mark or wordmark.
- Keep nav simple.
- Use linen/taupe text on dark surfaces.
- Active/hover state should use copper or cyan.

#### Home

Use the Cedar & Circuitry hero pattern:

```text
AI engineer. Therapist. Systems thinker. Based on Vancouver Island.
```

Include CTAs for About and Projects/Writing.

#### Writing

Use `.cc-prose` or equivalent prose styles. Prioritize readability over visual effects.

#### Projects

Lean slightly more technical: cyan details, code/data cards, system labels.

#### Therapy-adjacent content

Lean warmer: fern/copper accents, calmer cards, no overly clinical imagery.

#### Admin/CMS

When admin theming is implemented, use the same token set but reduce decorative overlays. Forms and publishing workflow must remain visually clear and calm.

## Acceptance criteria

A PR implementing this design kit is acceptable when:

- [ ] `apps/site/src/styles/cedar-circuitry.css` is imported once globally.
- [ ] No duplicate or competing colour system exists in the public site.
- [ ] Header uses the Cedar & Circuitry logo/mark.
- [ ] Favicon uses `/brand/favicon.svg`.
- [ ] Buttons use `.cc-button`, `.cc-button--primary`, and `.cc-button--secondary` or equivalent tokenized component styles.
- [ ] Cards use tokenized surfaces, borders, radii, and shadows.
- [ ] Prose pages have readable line length and line height.
- [ ] Links have visible hover and focus states.
- [ ] Keyboard focus is visible on interactive elements.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Public pages remain responsive at mobile, tablet, and desktop widths.
- [ ] The design does not introduce inaccessible text-on-image combinations.
- [ ] The design remains aligned with the project requirement: calm, credible, distinctive, Pacific Northwest-inspired, readable, and subtle.
- [ ] All new style decisions are either based on this kit or documented in the PR.

## Suggested build order

1. Add assets and style files.
2. Wire global CSS into root layout.
3. Add favicon metadata.
4. Build shared layout/header/footer with logo.
5. Build home hero using the style guide pattern.
6. Build reusable Button/Card/Chip components.
7. Apply prose styling to writing pages.
8. Apply card styling to projects, bookshelf, timeline, links, and Now modules.
9. Add visual QA pass for mobile, keyboard, contrast, reduced motion.
10. Update screenshots or docs as the site becomes concrete.

## Guardrails

Do not:

- replace this with a generic Tailwind theme without mapping tokens
- introduce bright neon AI colours
- overuse circuit imagery
- make every card copper
- use stock therapy imagery
- hide focus states
- prioritize animation over readability
- connect public site rendering to draft/private CMS content

Do:

- keep the public site static-first and fast
- keep admin interactions calm and obvious
- design for weekly updates
- make content modules feel reusable
- preserve accessibility from the beginning
