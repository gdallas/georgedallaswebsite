# Cedar & Circuitry — Website Style Guide

**Direction:** Human. Technical. Grounded. Intentional.
**Use for:** George Dallas personal website, public site, admin polish, project cards, writing templates, Now page, bookshelf, timeline, and link hub.

This style guide supports the website requirement that the public identity be personal, calm, credible, distinctive, Pacific Northwest-inspired, readable, accessible, and subtle rather than gimmicky. It also supports the backend principle that the site should be pleasant enough to update regularly.

---

## 1. Brand idea

Cedar & Circuitry blends three parts of George’s identity:

1. **AI engineer:** systems, code, architecture, clarity, iteration.
2. **Therapist:** care, listening, meaning, trust, human change.
3. **Vancouver Island:** cedar, ferns, stone, water, low light, grounded natural textures.

The design should feel like a thoughtful workshop at the forest edge: intelligent tools, human care, quiet confidence.

Avoid:

- neon AI clichés
- therapy-site stock imagery
- excessive animation
- cold corporate minimalism
- decorative nature elements that reduce readability

Prefer:

- warm dark surfaces
- quiet copper accents
- natural texture used sparingly
- generous spacing
- strong typography
- cards with clear information hierarchy
- accessible contrast and keyboard states

---

## 2. Colour system

| Token | Hex | Role |
|---|---:|---|
| Deep Cedar | `#18120E` | Primary dark background |
| Burnt Umber | `#241B16` | Secondary surface |
| Dark Bark | `#3A2D25` | Raised surface / border |
| Warm Linen | `#F1E8D8` | Primary text on dark |
| Soft Linen | `#FFF4E4` | High-emphasis text / light cards |
| Taupe | `#B8AFA3` | Muted text |
| Copper | `#C47A45` | Primary accent / CTA |
| Copper Dark | `#9D5730` | Hover / pressed accent |
| Desaturated Cyan | `#6CA6A8` | Technical accent / links |
| Fern | `#78946F` | Nature accent / success states |
| Granite | `#817C73` | Quiet dividers / disabled states |
| Mist | `#E7DED2` | Light mode background |
| Ink | `#211A16` | Light mode text |

### Usage ratios

Use the palette approximately like this:

```text
70% dark cedar / umber surfaces
15% linen / taupe typography
8% copper accent
5% fern and cyan supporting accents
2% texture, pattern, special states
```

Copper should feel intentional. Do not make every link, icon, and rule copper. Use cyan for technical links/details and fern for care/nature/success.

---

## 3. Typography

Recommended families:

| Purpose | Font | Fallback |
|---|---|---|
| Display/headings | Fraunces | Georgia, Times New Roman, serif |
| Body/UI | IBM Plex Sans | Inter, system-ui, sans-serif |
| Code/data | IBM Plex Mono | SFMono-Regular, Consolas, monospace |

### Heading style

Headings should be expressive and warm, not corporate. Use tight letter spacing and comfortable line height.

```css
font-family: var(--font-display);
letter-spacing: -0.035em;
line-height: 1.04;
```

### Body style

Body copy should be highly readable, especially for long essays and blog imports.

```css
font-family: var(--font-body);
line-height: 1.65;
```

### Monospace style

Use monospace for metadata, code, build notes, dates, system labels, and subtle technical details. Do not overuse it.

---

## 4. Logo system

The kit includes a cedar tree with circuit roots.

Use:

```text
/brand/cedar-circuitry-logo.svg      Full logo
/brand/cedar-circuitry-mark.svg      Icon/mark
/brand/cedar-circuitry-wordmark.svg  Wordmark only
/brand/favicon.svg                   Favicon
```

### Logo usage

- Header: use the mark or full logo depending on available space.
- Footer: use full logo or mark plus short identity text.
- Favicon: use `/brand/favicon.svg`.
- Admin branding: use the mark in the CMS/admin dashboard where supported.
- Social cards: use the mark as a small seal, not as the whole image.

### Do not

- Recolour the mark arbitrarily.
- Add drop shadows to the logo.
- Place it over busy photography without a dark overlay.
- Rasterize it unless a platform requires PNG.

---

## 5. UI components

### Buttons

Primary button:

- copper background
- soft linen text
- subtle border
- slight upward hover movement

Secondary button:

- transparent background
- linen text
- border using tokenized border
- copper hover state

### Cards

Cards should feel like “contained thoughts” or “systems notes.” Use:

- dark raised surface
- one-pixel border
- large radius, not bubbly
- subtle copper/cyan gradient overlay
- clear heading + description + metadata

Use cards for:

- projects
- posts
- timeline entries
- books
- links
- Now page modules
- admin dashboard modules

### Chips / tags

Use pill chips for metadata. Suggested tones:

```html
<span class="cc-chip" data-tone="ai">AI</span>
<span class="cc-chip" data-tone="therapy">Therapy</span>
<span class="cc-chip" data-tone="systems">Systems</span>
```

---

## 6. Page guidance

### Home

The home page should immediately communicate:

> AI engineer. Therapist. Systems thinker. Based on Vancouver Island.

Preferred structure:

1. Hero with identity statement and two CTAs.
2. Four identity pillars: AI Engineering, Therapy, Systems Thinking, Vancouver Island.
3. Featured writing.
4. Featured projects.
5. Now page teaser.
6. Links/contact/footer.

### About

Warm, direct, credible. Balance professional identity with personal grounding. Avoid making it read like a CV only.

### Writing

Writing pages should be calmer and slightly more literary. Use generous line height, quiet metadata, and strong article rhythm.

### Projects

Project pages can lean more technical: cyan accents, code snippets, system diagrams, tags, technical stack labels.

### Now page

Should feel easy and alive. Use small cards and simple sections. This page should be frictionless to update.

### Bookshelf

Use warmer/card-like layouts. Bookshelf should feel reflective, not like an e-commerce grid.

### Timeline

Use a vertical line or branching system map motif. Keep dates clear and keyboard accessible.

### Admin/CMS

The admin should not become visually heavy. Use the same tokens, but reduce decorative textures. Prioritize clarity, forms, readable labels, calm dashboards, and obvious primary actions.

---

## 7. Accessibility rules

- Always use visible focus states.
- Do not rely on colour alone for status.
- Maintain readable line lengths: around 65–75 characters for prose.
- Keep motion subtle and respect `prefers-reduced-motion`.
- Do not put text directly on image backgrounds without overlays.
- Use semantic HTML before custom interaction patterns.
- Public images require alt text unless decorative.
- Cards that are links should have a single clear interactive target or use accessible block-link patterns.

---

## 8. Texture and imagery

Use imagery sparingly and with purpose:

- cedar bark
- ferns
- river stones
- foggy forest
- Vancouver Island coastline
- topographic lines
- circuit traces
- warm low light

Textures should be backgrounds, dividers, or subtle overlays. They should never interfere with reading.

---

## 9. Implementation files

Design tokens:

```text
apps/site/src/styles/tokens.css
packages/shared/src/design/brandTokens.ts
packages/shared/src/design/brandTokens.json
```

Global styles:

```text
apps/site/src/styles/cedar-circuitry.css
```

Assets:

```text
apps/site/public/brand/
```

Reference:

```text
docs/brand/cedar-circuitry-reference.png
```
