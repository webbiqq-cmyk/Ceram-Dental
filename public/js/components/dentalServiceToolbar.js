import { esc } from '../utils/format.js';
import { treatmentMeta } from './selectedServicesSummary.js';

const DESCRIPTIONS = {
  veneer: 'Facial ceramic restoration',
  crown: 'Crown, inlay, onlay or overlay',
  bridge: 'Fixed multi-unit restoration',
  implant: 'Implant-supported restoration',
  ortho: 'Retainer, tray or night guard — whole arch'
};

/**
 * Tooth-based treatments are assigned to whatever is selected on the
 * chart. An arch-based one (the orthodontic sheet) is added to the case
 * as a whole instead, so it stays enabled when no tooth is selected —
 * selecting teeth for a full-arch appliance would be meaningless.
 */
export function DentalServiceToolbar(selectedCount = 0, schema = null, extras = []) {
  const meta = treatmentMeta(schema);
  const toothButtons = [['none', 'No treatment', 'Clear assignment', '×']].concat(
    Object.entries(meta).filter(([, m]) => m.selection !== 'arch')
      .map(([key, m]) => [key, m.restoration, DESCRIPTIONS[key] || m.label, m.mark]));
  const archButtons = Object.entries(meta).filter(([, m]) => m.selection === 'arch');
  return '<div class="dental-toolbar" aria-label="Assign a restoration">' +
    '<div class="dental-toolbar-head"><strong>Treatment controls</strong><span>' + selectedCount + ' selected</span></div>' +
    '<div class="dental-toolbar-actions">' + toothButtons.map(([key, label, desc, mark]) =>
      '<button type="button" data-assign-service="' + esc(key) + '"' + (!selectedCount ? ' disabled' : '') +
      '><span aria-hidden="true">' + esc(mark) + '</span><b>' + esc(label) + '</b><small>' + esc(desc) + '</small></button>').join('') + '</div>' +
    (archButtons.length ? '<div class="dental-toolbar-actions dental-toolbar-arch">' + archButtons.map(([key, m]) =>
      '<button type="button" data-add-arch-service="' + esc(key) + '" aria-pressed="' + String(extras.includes(key)) + '"' +
      (extras.includes(key) ? ' class="is-added"' : '') + '><span aria-hidden="true">' + esc(m.mark) + '</span><b>' +
      esc(extras.includes(key) ? m.restoration + ' added' : 'Add ' + m.restoration.toLowerCase()) + '</b><small>' +
      esc(DESCRIPTIONS[key] || m.label) + '</small></button>').join('') + '</div>' : '') +
    '</div>';
}
