// Restoration-design helpers: the live tooth diagram and the small pieces of
// logic that read a case's/wizard's shade combination and design fields.
import { esc } from './format.js';
import { RESTORATION_SERVICES } from '../constants.js';

export function isRestoration(key) { return !!RESTORATION_SERVICES[key]; }

export function shadeCombo(sh) {
  if (!sh) return '—';
  const parts = [sh.cervical, sh.body, sh.incisal].filter(x => x && x !== '—');
  return parts.length ? parts.join(' / ') : (sh.body || '—');
}

// Approximate facial enamel tones for each VITA shade — used by the tooth diagram.
const SHADE_HEX = {
  'A1': '#EEE4CF', 'A2': '#E8D9BC', 'A3': '#E0CBA4', 'A3.5': '#D7BE8E',
  'B1': '#F0E7D2', 'B2': '#E6D7B5', 'C2': '#D3C7AD', 'D3': '#D1C4AE'
};
export function shadeHex(s, fallback) { return SHADE_HEX[s] || fallback || '#E8D9BC'; }

const COVERAGE_TEXT = {
  veneers: 'Facial veneer — covers only the visible front surface; the back of the tooth stays natural.',
  crowns: 'Full crown — caps the whole tooth, 360°, down to the prepared margin.',
  bridges: 'Fixed bridge — crowns cap the two anchor teeth and a joined pontic fills the gap.',
  implants: 'Implant crown — full coverage seated on the implant abutment.'
};

// Live diagram: a facial-view tooth split into cervical / body / incisal thirds,
// each tinted with its chosen shade, with an overlay showing what the restoration covers.
export function toothVizHtml(w) {
  const body = shadeHex(w.shadeBody, '#E8D9BC');
  const cerv = (!w.shadeCervical || w.shadeCervical === '—') ? body : shadeHex(w.shadeCervical, body);
  const inci = (!w.shadeIncisal || w.shadeIncisal === '—') ? body : shadeHex(w.shadeIncisal, body);
  const isVeneer = w.service === 'veneers';
  const toothPath = 'M22 30 C22 15 40 9 60 9 C80 9 98 15 98 30 L94 106 C92 130 78 143 60 143 C42 143 28 130 26 106 Z';
  let incMark = '';
  if (/halo/i.test(w.incisal || '')) incMark = '<rect x="0" y="126" width="120" height="17" fill="rgba(255,255,255,.5)"/>';
  else if (/cutback|mamelon/i.test(w.incisal || '')) incMark = '<path d="M40 116 v22 M60 114 v24 M80 116 v22" stroke="rgba(120,86,104,.32)" stroke-width="4" stroke-linecap="round"/>';
  const svg = '<svg viewBox="0 0 120 152" width="118" height="150" role="img" aria-label="Tooth shade and coverage diagram">' +
    '<defs><clipPath id="tvClip"><path d="' + toothPath + '"/></clipPath></defs>' +
    '<path d="M6 22 C30 8 90 8 114 22 L114 33 C90 19 30 19 6 33 Z" fill="var(--violet-soft)"/>' +
    '<g clip-path="url(#tvClip)">' +
      '<rect x="0" y="0" width="120" height="53" fill="' + cerv + '"/>' +
      '<rect x="0" y="53" width="120" height="45" fill="' + body + '"/>' +
      '<rect x="0" y="98" width="120" height="54" fill="' + inci + '"/>' +
      incMark +
    '</g>' +
    '<path d="' + toothPath + '" fill="none" stroke="' + (isVeneer ? 'var(--line)' : 'var(--violet)') + '" stroke-width="' + (isVeneer ? 2 : 3.5) + '"/>' +
    (isVeneer ? '<path d="M27 33 C27 20 42 15 60 15 C78 15 93 20 93 33 L90 101" fill="none" stroke="var(--violet)" stroke-width="3.5" stroke-dasharray="5 4" stroke-linecap="round"/>' : '') +
    '<line x1="102" y1="30" x2="118" y2="30" stroke="var(--ink-soft)" stroke-width="1"/><text x="100" y="27" text-anchor="end" font-size="8" fill="var(--ink-soft)">cervical</text>' +
    '<line x1="102" y1="76" x2="118" y2="76" stroke="var(--ink-soft)" stroke-width="1"/><text x="100" y="73" text-anchor="end" font-size="8" fill="var(--ink-soft)">body</text>' +
    '<line x1="102" y1="120" x2="118" y2="120" stroke="var(--ink-soft)" stroke-width="1"/><text x="100" y="117" text-anchor="end" font-size="8" fill="var(--ink-soft)">incisal</text>' +
    '</svg>';
  function sw(hex, label, shade) { return '<div><span class="sw" style="background:' + hex + '"></span>' + label + ' <b>' + esc(shade) + '</b></div>'; }
  const legend = '<div class="tooth-legend">' +
    sw(cerv, 'Cervical ⅓', (w.shadeCervical && w.shadeCervical !== '—') ? w.shadeCervical : w.shadeBody + ' (blend)') +
    sw(body, 'Body ⅓', w.shadeBody) +
    sw(inci, 'Incisal ⅓', ((w.shadeIncisal && w.shadeIncisal !== '—') ? w.shadeIncisal : w.shadeBody + ' (blend)') + ' · ' + (w.incisal || '')) +
    '<div class="tooth-cover">' + esc(COVERAGE_TEXT[w.service] || '') + '</div>' +
  '</div>';
  return '<div class="tooth-viz">' + svg + legend + '</div>';
}
