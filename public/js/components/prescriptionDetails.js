// The prescription as the lab reads it.
//
// One component, used by every downstream role — reception checking a
// case in, the designer, the technician at the bench, QC, and the lab
// manager — so what a dentist prescribed and what the floor sees are the
// same words in the same order, with no role-specific paraphrase in
// between.
//
// Cases created before the structured prescription existed have no
// `prescription` object at all. They are not an error and must not render
// as a gap: PrescriptionDetails returns '' for them and the caller falls
// back to the instructions prose those cases have always carried.
import { esc } from '../utils/format.js';
import { toothMeta } from './toothMetadata.js';
import { isActive, labelFor } from '../utils/prescriptionSchema.js';
import { OptionArt } from './prescriptionArt.js';

const ARCH_LABELS = { upper: 'Upper arch', lower: 'Lower arch', both: 'Upper and lower arches' };

function unitsBlock(values) {
  if (values.arch) return '<div class="rx-read-units"><span class="review-label">Arch</span><p>' + esc(ARCH_LABELS[values.arch] || values.arch) + '</p></div>';
  const teeth = Array.isArray(values.teeth) ? values.teeth : [];
  if (!teeth.length) return '';
  return '<div class="rx-read-units"><span class="review-label">Units</span><ul class="rx-tooth-list">' +
    teeth.map(n => '<li><strong>' + n + '</strong><span>' + esc(toothMeta(n).name) + '</span></li>').join('') + '</ul></div>';
}

function row(field, values) {
  const value = values[field.key];
  const art = field.type === 'smile' ? OptionArt('smile', value) : (field.art ? OptionArt(field.art, value) : '');
  const other = field.other && values[field.other] ? ' — ' + values[field.other] : '';
  return '<div class="rx-read-row">' + (art ? '<span class="rx-read-art">' + art + '</span>' : '') +
    '<div><dt>' + esc(field.label) + '</dt><dd>' + esc(labelFor(field, value) + other) + '</dd></div></div>';
}

/**
 * @param prescription  order.prescription, or null for a legacy case
 * @param schema        the loaded catalogue, or null if it never arrived
 */
export function PrescriptionDetails(prescription, schema) {
  if (!prescription || !prescription.treatment) return '';
  const treatment = schema && schema.treatments[prescription.treatment];
  if (!treatment) {
    // The catalogue is unavailable or no longer defines this treatment.
    // Showing the raw keys would be worse than saying so plainly; the
    // caller still renders the instructions prose underneath.
    return '<div class="case-alert case-alert-info"><strong>Structured prescription unavailable</strong><p>The clinic prescription sheet for this case could not be loaded. The written instructions below are complete.</p></div>';
  }
  const sections = treatment.sections.map(section => {
    const rows = section.fields.filter(f => isActive(f, prescription) &&
      prescription[f.key] !== undefined && prescription[f.key] !== '' &&
      !(Array.isArray(prescription[f.key]) && !prescription[f.key].length));
    if (!rows.length) return '';
    return '<section class="rx-read-section"><h4>' + esc(section.title) + '</h4><dl>' + rows.map(f => row(f, prescription)).join('') + '</dl></section>';
  }).join('');

  return '<div class="rx-read"><header class="rx-read-head"><span class="service-card-mark" data-service="' + esc(prescription.treatment) + '">' +
    esc(treatment.mark) + '</span><div><span class="review-label">Clinic prescription</span><h3>' + esc(treatment.label) + '</h3></div></header>' +
    unitsBlock(prescription) +
    (sections || '<p class="case-muted">No options were selected beyond the required minimum.</p>') +
    (prescription.notes ? '<section class="rx-read-section"><h4>Clinical instructions</h4><p class="case-prose">' + esc(prescription.notes) + '</p></section>' : '') +
    '</div>';
}
