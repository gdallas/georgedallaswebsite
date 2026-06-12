# Cedar & Circuitry Style Kit

This zip contains the **Cedar & Circuitry** brand/style-guide files for `gdallas/georgedallaswebsite`.

The identity is built around the selected direction: **human, technical, grounded, intentional**. It combines cedar, fern, stone, copper, and circuit traces so the site can present George as both an AI engineer and therapist without feeling like a generic SaaS portfolio or a disconnected therapy site.

## Where to drop this

Unzip this package at the **root of the repository**:

```bash
cd /path/to/georgedallaswebsite
unzip cedar-circuitry-style-kit.zip
```

It is structured with repo-relative paths, so the files will land in:

```text
apps/site/public/brand/
apps/site/src/styles/
apps/site/src/components/brand/
packages/shared/src/design/
docs/brand/
```

## What is included

```text
docs/brand/cedar-circuitry-style-guide.md
  Human-readable style guide for design decisions.

docs/brand/cedar-circuitry-codex-implementation.md
  Codex-specific implementation instructions and acceptance criteria.

docs/brand/cedar-circuitry-reference.png
  Visual reference board from the chosen style direction.

apps/site/public/brand/cedar-circuitry-logo.svg
  Full logo: cedar tree with circuit roots + George Dallas wordmark.

apps/site/public/brand/cedar-circuitry-mark.svg
  Standalone cedar/circuit mark for favicon, nav, social, cards, and admin branding.

apps/site/public/brand/cedar-circuitry-wordmark.svg
  Wordmark only.

apps/site/public/brand/favicon.svg
  SVG favicon using the cedar/circuit mark.

apps/site/src/styles/tokens.css
  CSS custom properties for colours, typography, spacing, radii, motion, and shadows.

apps/site/src/styles/cedar-circuitry.css
  Global base styles, utility classes, buttons, cards, prose, hero treatment, focus states.

apps/site/src/components/brand/*.astro
  Starter Astro components for logo, buttons, cards, and a hero example.

packages/shared/src/design/brandTokens.ts
packages/shared/src/design/brandTokens.json
  Shared design-token source for site, CMS, tests, scripts, or future tooling.
```

## First Codex task after import

Ask Codex to:

1. Import `apps/site/src/styles/cedar-circuitry.css` once from the root Astro layout.
2. Place `/brand/favicon.svg` into the site metadata/favicon setup.
3. Use `CedarCircuitryLogo.astro` in the primary site header.
4. Replace placeholder visual styling with the tokenized classes in `cedar-circuitry.css`.
5. Keep all future colours, borders, shadows, and spacing mapped to these tokens unless there is a documented reason not to.

## Important implementation note

This kit does **not** include font files. Use the named font families only if the project later self-hosts or otherwise loads them properly:

- Display: Fraunces
- Body/UI: IBM Plex Sans
- Mono: IBM Plex Mono

Until then, the CSS includes safe fallbacks.
