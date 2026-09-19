// Schematic artwork for the prescription options.
//
// Every clinical choice on the clinic sheets is easier to make from a
// picture than from a phrase — "modified ridge lap" means very little as
// text and is obvious as a shape. The sheets themselves illustrate this
// with photographs, which are not in this repository; pulling stock
// photography off the internet to stand in for them would put pictures of
// other people's dentistry next to a prescription, which is worse than no
// picture at all.
//
// So each option gets a diagram, drawn here as inline SVG: no downloads,
// no Base64, no external requests, and it inherits the page's own colours
// through currentColor so it works in either theme.
//
// Anything not drawn here simply falls back to the option's initial —
// art is an aid, never a requirement.
import { esc } from '../utils/format.js';

const svg = (body, view = '0 0 48 44') =>
  '<svg viewBox="' + view + '" class="rx-art" aria-hidden="true" focusable="false">' + body + '</svg>';

// One anterior tooth silhouette, used as the canvas for the options that
// describe a tooth's own surface.
const TOOTH = '<path class="rx-body" d="M13 6h22v17c0 9-5 15-11 15S13 32 13 23Z"/>';
// One molar seen from above, for the occlusal questions.
const OCCLUSAL = '<rect class="rx-body" x="9" y="7" width="30" height="30" rx="9"/>';
// A gum line, for anything described relative to soft tissue.
const GUM = '<path class="rx-gum" d="M6 10c6-5 30-5 36 0"/>';

const ART = {
  // Translucency built up in layers — one band, two, then a full incisal
  // third, matching Standard / Mid Lucent / Ultra Glow.
  layering: {
    standard: svg(TOOTH + '<path class="rx-line" d="M14 30h20"/>'),
    mid_lucent: svg(TOOTH + '<path class="rx-line" d="M14 30h20M13.5 25h21"/>'),
    ultra_glow: svg(TOOTH + '<path class="rx-line" d="M14 32h20M14 28h20M13.5 24h21M13 20h22"/>')
  },
  // One shade across the unit, versus cervical-to-incisal graduation.
  gradient: {
    one_shade: svg(TOOTH + '<path class="rx-fill" d="M15 8h18v15c0 7-4 12-9 12s-9-5-9-12Z"/>'),
    gradual_shade: svg(TOOTH + '<path class="rx-fill" d="M15 8h18v8H15Z"/><path class="rx-fill rx-soft" d="M15 16h18v7H15Z"/><path class="rx-fill rx-softer" d="M15 23h18c0 7-4 12-9 12s-9-5-9-12Z"/>')
  },
  // Vertical developmental grooves plus horizontal perikymata.
  texture: {
    smooth: svg(TOOTH + '<path class="rx-shine" d="M18 11c0 6-1 12-2 17"/>'),
    natural: svg(TOOTH + '<path class="rx-line" d="M20 11v20M28 11v20"/>'),
    pro: svg(TOOTH + '<path class="rx-line" d="M18 11v20M24 10v22M30 11v20M15 17c6 2 12 2 18 0M15 24c6 2 12 2 18 0"/>')
  },
  // Tissue left exactly as found — the arc is drawn, then marked "as is".
  gingiva: {
    maintain_existing: svg('<path class="rx-gum" d="M8 14c8-7 24-7 32 0"/>' + TOOTH + '<path class="rx-line rx-dashed" d="M8 14c8-7 24-7 32 0"/>')
  },
  // How much of the tooth the restoration covers, in cross-section.
  restoration: {
    full_crown: svg(OCCLUSAL + '<path class="rx-fill" d="M11 9h26v26H11Z" opacity=".55"/>'),
    veneer_crown_360: svg(OCCLUSAL + '<rect class="rx-fill" x="11" y="9" width="26" height="26" rx="7" opacity=".35"/><rect class="rx-line" x="15" y="13" width="18" height="18" rx="5" fill="none"/>'),
    inlay: svg(OCCLUSAL + '<path class="rx-fill" d="M19 17h10v10H19Z"/>'),
    onlay: svg(OCCLUSAL + '<path class="rx-fill" d="M15 15h18v14H15Z"/>'),
    overlay: svg(OCCLUSAL + '<path class="rx-fill" d="M12 12h24v20H12Z"/>')
  },
  // The shape cut into the occlusal surface.
  occlusal: {
    standard: svg(OCCLUSAL + '<path class="rx-line" d="M14 22h20M24 14v16"/>'),
    deep_fissure: svg(OCCLUSAL + '<path class="rx-line rx-heavy" d="M13 22h22M24 12v20M17 16l-3 4M31 16l3 4"/>'),
    flat_table: svg(OCCLUSAL + '<path class="rx-fill" d="M14 14h20v16H14Z" opacity=".35"/><path class="rx-line" d="M14 22h20"/>'),
    cuspal_reduction: svg(OCCLUSAL + '<path class="rx-line rx-dashed" d="M12 15h24M12 29h24"/><path class="rx-line" d="M14 22h20"/>')
  },
  // Two neighbours, with the interproximal contact opened or closed.
  contacts: {
    normal: svg('<rect class="rx-body" x="5" y="10" width="18" height="24" rx="6"/><rect class="rx-body" x="25" y="10" width="18" height="24" rx="6"/>'),
    tight: svg('<rect class="rx-body" x="6" y="10" width="19" height="24" rx="6"/><rect class="rx-body" x="23" y="10" width="19" height="24" rx="6"/><path class="rx-line rx-heavy" d="M24 14v16"/>'),
    open: svg('<rect class="rx-body" x="3" y="10" width="17" height="24" rx="6"/><rect class="rx-body" x="28" y="10" width="17" height="24" rx="6"/><path class="rx-line rx-dashed" d="M21 22h6"/>'),
    specify: svg('<rect class="rx-body" x="5" y="10" width="18" height="24" rx="6"/><rect class="rx-body" x="25" y="10" width="18" height="24" rx="6"/><text class="rx-glyph" x="24" y="26" text-anchor="middle">?</text>')
  },
  // Glaze reads as a highlight; a mechanical polish as directional strokes.
  finishing: {
    glazing: svg(TOOTH + '<path class="rx-shine" d="M19 11c-1 5-2 9-2 14"/><path class="rx-shine" d="M23 12c0 4-1 8-1 12"/>'),
    mechanical_polish: svg(TOOTH + '<path class="rx-line" d="M16 14c5 2 11 2 16 0M16 20c5 2 11 2 16 0M16 26c5 2 11 2 16 0"/>')
  },
  // The profile of the restoration as it leaves the tissue.
  emergence: {
    natural: svg(GUM + '<path class="rx-body" d="M16 10h16v14c0 8-4 13-8 13s-8-5-8-13Z"/>'),
    concave: svg(GUM + '<path class="rx-body" d="M15 10c3 5 3 9 0 13 3 5 3 10 1 14h16c-2-4-2-9 1-14-3-4-3-8 0-13Z"/>'),
    convex: svg(GUM + '<path class="rx-body" d="M12 10c5 4 5 10 2 15 2 5 2 9 1 12h18c-1-3-1-7 1-12-3-5-3-11 2-15Z"/>'),
    custom: svg(GUM + '<path class="rx-body rx-dashed" d="M16 10h16v14c0 8-4 13-8 13s-8-5-8-13Z"/><text class="rx-glyph" x="24" y="28" text-anchor="middle">?</text>')
  },
  // The pontic's undersurface against the residual ridge.
  pontic: {
    ridge_lap: svg('<path class="rx-ridge" d="M4 34c10-8 30-8 40 0"/><path class="rx-body" d="M13 8h22v13c0 8-6 12-11 14-5-2-11-6-11-14Z"/>'),
    modified_ridge_lap: svg('<path class="rx-ridge" d="M4 34c10-8 30-8 40 0"/><path class="rx-body" d="M13 8h22v13c0 6-4 9-8 11-6-1-14-4-14-11Z"/>'),
    hygienic: svg('<path class="rx-ridge" d="M4 34c10-8 30-8 40 0"/><path class="rx-body" d="M13 8h22v11c0 3-4 5-11 5S13 22 13 19Z"/><path class="rx-line rx-dashed" d="M13 27h22"/>'),
    ovate: svg('<path class="rx-ridge" d="M4 32c10-6 30-6 40 0"/><path class="rx-body" d="M13 8h22v12c0 9-5 14-11 14S13 29 13 20Z"/><path class="rx-line" d="M15 30c5 4 13 4 18 0"/>'),
    full_contour: svg('<path class="rx-ridge" d="M4 36c10-8 30-8 40 0"/><path class="rx-body" d="M13 6h22v16c0 10-5 16-11 16S13 32 13 22Z"/>')
  },
  // How much gum tissue the prosthesis has to replace (FP classification).
  fp: {
    fp1: svg('<path class="rx-gum" d="M6 12c8-5 28-5 36 0"/><path class="rx-body" d="M15 12h18v12c0 8-4 13-9 13s-9-5-9-13Z"/>'),
    fp2: svg('<path class="rx-pink" d="M9 9h30v7H9Z"/><path class="rx-body" d="M15 16h18v10c0 7-4 11-9 11s-9-4-9-11Z"/>'),
    fp3: svg('<path class="rx-pink" d="M7 8h34v13H7Z"/><path class="rx-body" d="M16 21h16v7c0 6-3 9-8 9s-8-3-8-9Z"/>')
  },
  // Units carried on implant fixtures.
  implantRestoration: {
    single_crown: svg('<path class="rx-body" d="M18 8h12v10c0 6-3 9-6 9s-6-3-6-9Z"/><path class="rx-line rx-heavy" d="M24 27v11M20 31h8M21 35h6"/>'),
    bridge: svg('<path class="rx-body" d="M7 9h34v9c0 6-4 9-17 9S7 24 7 18Z"/><path class="rx-line rx-heavy" d="M13 27v10M9 31h8M35 27v10M31 31h8"/>'),
    full_arch: svg('<path class="rx-body" d="M4 12c9-7 31-7 40 0 0 8-6 13-20 13S4 20 4 12Z"/><path class="rx-line rx-heavy" d="M11 25v11M7 29h8M24 27v11M20 31h8M37 25v11M33 29h8"/>')
  },
  // The connection between fixture and restoration.
  abutment: {
    customized: svg('<path class="rx-body" d="M16 10c3-2 13-2 16 0l-3 14c-2 2-8 2-10 0Z"/><path class="rx-line rx-heavy" d="M24 26v10M20 30h8"/>'),
    screw_retained: svg('<path class="rx-body" d="M17 10h14v16H17Z"/><path class="rx-line rx-heavy" d="M24 6v30"/><path class="rx-line" d="M20 12h8M20 18h8M20 24h8"/>'),
    ti_base: svg('<path class="rx-body" d="M15 8h18v8H15Z"/><path class="rx-body" d="M19 16h10v11H19Z"/><path class="rx-line rx-heavy" d="M24 6v32"/>')
  },
  // How the restoration is held down.
  retention: {
    screw_retained: svg('<path class="rx-body" d="M14 8h20v16c0 7-4 11-10 11s-10-4-10-11Z"/><path class="rx-line rx-heavy" d="M24 6v24"/><path class="rx-line" d="M21 12h6M21 17h6M21 22h6"/>'),
    cement_retained: svg('<path class="rx-body" d="M14 8h20v16c0 7-4 11-10 11s-10-4-10-11Z"/><path class="rx-line rx-dashed" d="M17 12h14v14c0 4-3 7-7 7s-7-3-7-7Z"/>')
  },
  // Tissue shade, shown as the shade itself.
  gingivaShade: {
    light_pink: svg('<circle class="rx-swatch" cx="24" cy="22" r="14" style="fill:#f3c7cd"/>'),
    pink: svg('<circle class="rx-swatch" cx="24" cy="22" r="14" style="fill:#e39aa7"/>'),
    dark_pink: svg('<circle class="rx-swatch" cx="24" cy="22" r="14" style="fill:#c4717f"/>'),
    reddish: svg('<circle class="rx-swatch" cx="24" cy="22" r="14" style="fill:#b3535b"/>')
  },
  // Which arch the appliance is for.
  arch: {
    upper: svg('<path class="rx-arch rx-fill" d="M5 10c8-7 30-7 38 0 0 9-8 15-19 15S5 19 5 10Z"/><path class="rx-arch rx-ghost" d="M5 38c0-9 8-15 19-15s19 6 19 15Z"/>'),
    lower: svg('<path class="rx-arch rx-ghost" d="M5 10c8-7 30-7 38 0 0 9-8 15-19 15S5 19 5 10Z"/><path class="rx-arch rx-fill" d="M5 38c0-9 8-15 19-15s19 6 19 15Z"/>'),
    both: svg('<path class="rx-arch rx-fill" d="M5 10c8-7 30-7 38 0 0 9-8 15-19 15S5 19 5 10Z"/><path class="rx-arch rx-fill" d="M5 38c0-9 8-15 19-15s19 6 19 15Z"/>')
  },
  // Appliance form — thin and clear, rigid, or cushioned.
  appliance: {
    essix_retainer: svg('<path class="rx-line" d="M6 14c8-7 28-7 36 0 0 10-8 17-18 17S6 24 6 14Z" fill="none"/><path class="rx-line rx-dashed" d="M10 16c6-5 22-5 28 0"/>'),
    bleaching_tray: svg('<path class="rx-body" d="M6 14c8-7 28-7 36 0 0 10-8 17-18 17S6 24 6 14Z" opacity=".35"/><circle class="rx-dot" cx="17" cy="19" r="2"/><circle class="rx-dot" cx="24" cy="21" r="2"/><circle class="rx-dot" cx="31" cy="19" r="2"/>'),
    night_guard: svg('<path class="rx-body" d="M4 14c9-8 31-8 40 0 0 12-9 20-20 20S4 26 4 14Z" opacity=".5"/><path class="rx-line" d="M10 16c7-6 21-6 28 0"/>')
  },
  // Where the appliance's edge sits relative to the gum margin.
  trim: {
    standard: svg('<path class="rx-gum" d="M5 26c8 6 30 6 38 0"/><path class="rx-line rx-heavy" d="M5 22c8 6 30 6 38 0"/>'),
    scalloped: svg('<path class="rx-gum" d="M5 26c8 6 30 6 38 0"/><path class="rx-line rx-heavy" d="M5 22c3 5 6 5 9 0 3 5 6 5 9 0 3 5 6 5 9 0 3 5 6 5 9 0"/>'),
    extended: svg('<path class="rx-gum" d="M5 20c8 6 30 6 38 0"/><path class="rx-line rx-heavy" d="M5 31c8 6 30 6 38 0"/><path class="rx-line rx-dashed" d="M5 20c8 6 30 6 38 0"/>')
  }
};

/**
 * A smile-design preview, drawn from the design's own identifier.
 *
 * The clinic names ten designs, five per arch character. Rather than
 * invent a look for each name, the diagram is parametric: the number
 * (1–5) drives how dominant the centrals are and how defined the incisal
 * edges get, and the F/M category drives how rounded the corners are.
 * That is a schematic of the proportions, which is what a design choice
 * actually is — it is not a photograph of anyone's teeth.
 */
export function SmileArt(value) {
  const level = Math.min(5, Math.max(1, Number(String(value).slice(1)) || 1));
  const round = String(value).charAt(0).toUpperCase() === 'F';
  const radius = round ? 5 - level * 0.4 : 2.2 - level * 0.3;
  const centralWidth = 9 + level * 0.9;
  const lateralDrop = 1.5 + level * 1.1;   // how much shorter the laterals sit
  const canineDrop = 0.8 + level * 0.5;
  const height = 20;
  const gap = 0.9;

  // Half an arch, mirrored — central, lateral, canine outward from centre.
  const widths = [centralWidth, centralWidth * 0.74, centralWidth * 0.66];
  const drops = [0, lateralDrop, canineDrop];
  let teeth = '';
  for (const side of [-1, 1]) {
    let x = side === -1 ? 24 - gap / 2 : 24 + gap / 2;
    for (let i = 0; i < 3; i += 1) {
      const w = widths[i];
      const left = side === -1 ? x - w : x;
      teeth += '<rect class="rx-body" x="' + left.toFixed(1) + '" y="' + (10 + drops[i]).toFixed(1) +
        '" width="' + w.toFixed(1) + '" height="' + (height - drops[i]).toFixed(1) +
        '" rx="' + radius.toFixed(1) + '" ry="' + Math.max(1, radius * 0.7).toFixed(1) + '"/>';
      x += side * (w + gap);
    }
  }
  return svg('<path class="rx-lip" d="M2 8c10-6 34-6 44 0"/>' + teeth +
    '<path class="rx-lip" d="M2 36c10 6 34 6 44 0"/>', '0 0 48 44');
}

/** The diagram for one option, or '' where none is drawn. */
export function OptionArt(art, value) {
  if (art === 'smile') return SmileArt(value);
  const set = ART[art];
  return (set && set[value]) || '';
}

/** A shade chip, coloured from the shade's own family. */
export function ShadeArt(shade) {
  const tones = { A: '#f0dcb4', B: '#f6e8c8', C: '#ded5c6', D: '#e9d7bd', N: '#fbf6ec' };
  return '<i class="shade-chip" style="background:' + (tones[String(shade)[0]] || '#f5f1ea') + '" aria-hidden="true"></i>';
}

export function artLabel(text) { return '<span class="rx-art-label">' + esc(text) + '</span>'; }
