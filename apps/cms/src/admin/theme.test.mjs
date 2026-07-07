import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

// The Cedar & Circuitry admin palette lives in app/(payload)/custom.css as
// redefinitions of Payload's --color-* ramps. These tests parse the shipped
// CSS and verify the WCAG pairings the admin depends on, so a future hex
// tweak can't silently regress contrast (GDW-055 acceptance criterion).
//
// Payload maps light-theme elevations onto the ramp directly and dark-theme
// elevations onto the same ramp reversed (dark elevation-0 = base-900,
// elevation-800 = base-100, banner tones flip -600/-100 to -400/-900), which
// is why each pairing below is checked from both ends of the ramp.

const cssPath = fileURLToPath(new URL("../app/(payload)/custom.css", import.meta.url));
const css = readFileSync(cssPath, "utf8");

const ramps = {};
for (const [, ramp, step, hex] of css.matchAll(
  /--color-(base|success|error|warning)-(\d+):\s*(#[0-9a-fA-F]{6})/g
)) {
  ramps[ramp] ??= {};
  ramps[ramp][step] = hex;
}

// Named surface/accent decisions (--gdw-*), e.g. the linen page background
// and the copper primary buttons.
const surfaces = {};
for (const [, name, hex] of css.matchAll(/--gdw-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  surfaces[name] = hex;
}

function luminance(hex) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function assertContrast(fg, bg, min, label) {
  const ratio = contrast(fg, bg);
  assert.ok(ratio >= min, `${label}: expected >= ${min}:1, got ${ratio.toFixed(2)}:1 (${fg} on ${bg})`);
}

describe("cedar & circuitry admin palette", () => {
  it("defines all 21 neutral steps and 19 steps per status ramp", () => {
    assert.equal(Object.keys(ramps.base).length, 21);
    for (const ramp of ["success", "error", "warning"]) {
      assert.equal(Object.keys(ramps[ramp]).length, 19, `${ramp} ramp incomplete`);
    }
  });

  it("keeps body text at WCAG AA in both themes", () => {
    const { base } = ramps;
    assertContrast(base[800], base[0], 4.5, "light body text (elevation-800 on bg)");
    assertContrast(base[800], base[100], 4.5, "light text on cards/inputs");
    assertContrast(base[0], base[900], 4.5, "dark body text");
    assertContrast(base[100], base[850], 4.5, "dark text on nav surface");
  });

  it("keeps status banner text at WCAG AA in both themes", () => {
    for (const ramp of ["success", "error", "warning"]) {
      assertContrast(ramps[ramp][600], ramps[ramp][100], 4.5, `light ${ramp} banner`);
      assertContrast(ramps[ramp][400], ramps[ramp][900], 4.5, `dark ${ramp} banner`);
    }
  });

  it("keeps focus rings and error borders visible (non-text 3:1) in both themes", () => {
    const { base, success, error } = ramps;
    // Payload's focus box-shadow and ::selection are compiled against the
    // success ramp; field error borders against error-400/500.
    assertContrast(success[500], base[0], 3, "light focus ring");
    assertContrast(success[500], base[900], 3, "dark focus ring");
    assertContrast(error[500], base[0], 3, "light error border");
    assertContrast(error[400], base[900], 3, "dark error border");
  });

  it("keeps secondary text at least at stock-Payload contrast in both themes", () => {
    // Payload shares elevation-500 between themes, so strict 4.5:1 on both
    // backgrounds is unsatisfiable by construction; stock ships 3.94 (light)
    // and 4.67 (dark). The granite step must stay at or above that floor.
    const { base } = ramps;
    assertContrast(base[500], base[0], 3.9, "light secondary text");
    assertContrast(base[500], base[900], 3.9, "dark secondary text");
  });

  it("keeps text readable on the linen page and mist nav surfaces", () => {
    const { base } = ramps;
    const page = surfaces["page-bg-light"];
    const nav = surfaces["nav-bg-light"];
    assertContrast(base[800], page, 4.5, "body text on linen page");
    assertContrast(base[600], page, 4.5, "field descriptions on linen page");
    // Granite secondary text steps down slightly on the deeper page surface
    // (stock-white gave 3.94); descriptions were lifted to elevation-600 to
    // compensate, and this floor keeps the page from deepening further.
    assertContrast(base[500], page, 3.5, "granite secondary text on linen page");
    assertContrast(base[800], nav, 4.5, "nav links on mist");
    // Nav group labels: stock paints them elevation-400 (~2.8:1 on white);
    // the theme lifts them to elevation-600, which must beat stock's ratio.
    assertContrast(base[600], nav, 4, "nav group labels on mist");
    // Dark nav is burnt umber (= base-850), already covered by the ramp
    // checks; re-assert against the declared surface to catch drift.
    assertContrast(base[100], surfaces["nav-bg-dark"], 4.5, "dark nav text on burnt umber");
    assertContrast(base[0], surfaces["page-bg-dark"], 4.5, "dark body text on deep cedar");
  });

  it("keeps copper primary buttons at WCAG AA, including hover", () => {
    assertContrast(surfaces["accent-text"], surfaces["accent"], 4.5, "copper button label");
    assertContrast(
      surfaces["accent-text"],
      surfaces["accent-hover"],
      4.5,
      "copper button label on hover"
    );
    // Button shape against both page backgrounds (non-text 3:1).
    assertContrast(surfaces["accent"], surfaces["page-bg-light"], 3, "copper on linen page");
    assertContrast(surfaces["accent"], surfaces["page-bg-dark"], 3, "copper on cedar page");
  });
});
