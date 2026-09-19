import { esc } from '../utils/format.js';
import { DentalChart } from './dentalChart.js';
import { groupServices } from './selectedServicesSummary.js';
import { toothMeta } from './toothMetadata.js';
import { isActive, labelFor, missingRequired, fieldsOf } from '../utils/prescriptionSchema.js';

const ARCH_LABELS = { upper: 'Upper arch', lower: 'Lower arch', both: 'Upper and lower arches' };

// Only what was actually chosen. An unanswered optional question is not a
// blank row on the review — it is a question the dentist decided not to
// answer, and printing "—" next to twelve of them buries the answers that
// matter.
function facts(key, config, schema) {
  const treatment = schema.treatments[key];
  return treatment.sections.flatMap(section => section.fields
    .filter(f => isActive(f, config) && config[f.key] !== undefined && config[f.key] !== '' && !(Array.isArray(config[f.key]) && !config[f.key].length))
    .map(f => [f.label, labelFor(f, config[f.key]) + (f.other && config[f.other] ? ' — ' + config[f.other] : '')]));
}

const COLUMN_FACTS = [['implantSystem', 'Implant type / platform'], ['scanBody', 'Scan body'], ['abutmentSize', 'Abutment size'], ['abutmentAvailability', 'Abutment availability']];

export function ReviewSummary(form, schema) {
  const groups = groupServices(form.teeth, schema, form.extras);
  return '<div class="review-summary dental-review">' +
    '<section class="review-case"><span class="review-label">Ceram digital prescription</span><h2>' + esc(form.patientRef) + '</h2>' +
    '<p>' + esc(form.caseKind || 'New case') + ' · ' + (form.deliveryMethod === 'delivery' ? 'Clinic delivery' : 'In-house pickup') +
    (form.targetDate ? ' · requested for ' + esc(form.targetDate) : '') + '</p></section>' +
    '<section class="review-map"><div class="review-section-head"><span class="review-label">Treatment map</span>' +
    '<button type="button" class="text-button" data-edit-step="1">Edit prescription</button></div>' + DentalChart(form.teeth, schema) + '</section>' +
    '<section><div class="review-section-head"><span class="review-label">Prescriptions</span><strong>' + groups.length + '</strong></div>' +
    groups.map(g => {
      const c = form.configs[g.key] || {};
      const rows = facts(g.key, c, schema).concat(g.key === 'implant' ? COLUMN_FACTS.filter(([k]) => c[k]).map(([k, label]) => [label, c[k]]) : []);
      const missing = missingRequired(schema, g.key, c);
      const fields = fieldsOf(schema, g.key);
      const heading = g.selection === 'arch'
        ? esc(ARCH_LABELS[c.arch] || 'Arch not chosen')
        : g.teeth.map(n => n + ' – ' + esc(toothMeta(n).name)).join('<br>');
      return '<article class="review-service"><div><span class="service-card-kicker">' + esc(g.label) + '</span><h3>' + heading + '</h3></div>' +
        (missing.length ? '<div class="case-alert case-alert-warning"><strong>Still required:</strong> ' +
          esc(missing.map(k => (fields.find(f => f.key === k) || { label: k }).label).join(', ')) + '</div>' : '') +
        '<dl>' + rows.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>' +
        (c.notes ? '<p><strong>Clinical instructions:</strong> ' + esc(c.notes) + '</p>' : '') + '</article>';
    }).join('') + '</section>' +
    '<section class="workspace-notice"><strong>Reference files come next.</strong> After these orders are created, you can securely attach scans, photos, PDFs, STL, OBJ or PLY files to each order.</section></div>';
}
