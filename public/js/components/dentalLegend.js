import { esc } from '../utils/format.js';
import { treatmentMeta } from './selectedServicesSummary.js';

export function DentalLegend(schema = null) {
  return '<div class="dental-legend" aria-label="Dental chart legend"><strong>Legend</strong>' +
    Object.entries(treatmentMeta(schema)).map(([key, m]) =>
      '<span data-legend="' + esc(key) + '"><i aria-hidden="true">' + esc(m.mark) + '</i>' + esc(m.restoration) + '</span>').join('') +
    '</div>';
}
