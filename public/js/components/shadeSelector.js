import { esc } from '../utils/format.js';

// The classic VITA families the clinic already used, plus the ND range the
// new sheets add. The lists are the server catalogue's
// (src/services/prescription.js) — passed in rather than restated — so a
// shade the server will not accept can never appear as a button. The
// fallback below is only for the brief window before the catalogue has
// loaded.
const FALLBACK = { classicShades: ['A1','A2','A3','A3.5','A4','B1','B2','B3','B4','C1','C2','C3','C4','D2','D3','D4'], ndShades: ['ND1','ND2','ND3','ND4','ND5'] };
const TONES = { A:'#f0dcb4', B:'#f6e8c8', C:'#ded5c6', D:'#e9d7bd', N:'#fbf6ec', O:'#f5f1ea' };

function group(title, shades, value, name) {
  return '<div class="shade-group"><span class="shade-group-label">' + esc(title) + '</span><div class="shade-selector" role="group" aria-label="' + esc(title) + '">' +
    shades.map(shade => '<button type="button" class="shade-tab' + (value === shade ? ' selected' : '') +
      '" data-option-group="' + esc(name) + '" data-option-value="' + esc(shade) +
      '" aria-pressed="' + String(value === shade) + '"><i style="background:' + (TONES[String(shade)[0]] || TONES.O) + '"></i><span>' + esc(shade) + '</span></button>').join('') +
    '</div></div>';
}

/**
 * One reusable shade control, used by every treatment that prescribes a
 * shade — and by the temporary-tooth shade on the orthodontic sheet,
 * which is why the field name is a parameter rather than hardcoded.
 */
export function ShadeSelector(value = '', options = {}) {
  const name = options.name || 'shade';
  const classic = options.classicShades || FALLBACK.classicShades;
  const nd = options.ndShades || FALLBACK.ndShades;
  return '<div class="shade-picker">' +
    group('Classic', classic, value, name) +
    group('ND range', nd, value, name) +
    group('Not listed', ['Other'], value, name) +
    '</div>';
}
