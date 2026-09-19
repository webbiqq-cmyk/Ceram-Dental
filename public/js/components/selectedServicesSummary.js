import { esc } from '../utils/format.js';
import { missingRequired, fieldsOf, labelFor } from '../utils/prescriptionSchema.js';

// Which treatments exist, what they are called and how they mark a tooth
// all come from the server catalogue. The fallback below covers the few
// milliseconds before it has loaded and the chart still has to paint; it
// carries no clinical options of its own, only the four labels that were
// already in this file before the catalogue existed.
const FALLBACK = {
  veneer: { label: 'Veneers', restoration: 'Veneer', mark: 'V', selection: 'teeth' },
  crown: { label: 'Crowns & fixed restorations', restoration: 'Crown', mark: 'C', selection: 'teeth' },
  bridge: { label: 'Bridges', restoration: 'Bridge', mark: 'B', selection: 'teeth' },
  implant: { label: 'Implant restorations', restoration: 'Implant restoration', mark: 'I', selection: 'teeth' },
  ortho: { label: 'Orthodontic & appliances', restoration: 'Appliance', mark: 'O', selection: 'arch' }
};

/** { key: {label, restoration, mark, selection} } for every treatment. */
export function treatmentMeta(schema) {
  if (!schema) return FALLBACK;
  const out = {};
  for (const [key, t] of Object.entries(schema.treatments)) {
    out[key] = { label: t.label, restoration: t.restoration, mark: t.mark, selection: t.selection };
  }
  return out;
}

// Kept as a named export because the chart, the toolbar and the review
// step all reach for it; it is the fallback shape above until the
// catalogue arrives, and treatmentMeta(schema) is the accurate version.
export const SERVICE_META = FALLBACK;

/**
 * The active prescriptions on this form.
 *
 * Tooth-based treatments group by the teeth carrying them. An arch-based
 * treatment (the orthodontic sheet) has no teeth at all — it is present
 * when it has been added to the case, which `extras` records.
 */
export function groupServices(teeth, schema = null, extras = []) {
  const meta = treatmentMeta(schema);
  return Object.keys(meta).map(key => ({
    key, ...meta[key],
    teeth: meta[key].selection === 'arch' ? [] : teeth.filter(t => t.service === key).map(t => t.number).sort((a, b) => a - b)
  })).filter(g => g.teeth.length || (g.selection === 'arch' && extras.includes(g.key)));
}

/** Completeness, judged by the same required list the server applies. */
export function prescriptionStatus(service, config = {}, schema = null) {
  if (!schema) return config.shade ? { state: 'ready', label: 'Ready', icon: '✓' } : { state: 'incomplete', label: 'Shade needed', icon: '◐' };
  const missing = missingRequired(schema, service, config);
  if (service === 'implant') {
    const columns = ['implantSystem', 'scanBody', 'abutmentSize'].filter(k => !String(config[k] || '').trim());
    if (columns.length) return { state: 'incomplete', label: 'Implant record incomplete', icon: '◐' };
  }
  if (!missing.length) return { state: 'ready', label: 'Ready', icon: '✓' };
  const fields = fieldsOf(schema, service);
  const first = fields.find(f => f.key === missing[0]);
  return { state: 'incomplete', label: (first ? first.label : missing[0]) + ' needed', icon: '◐' };
}

// A one-line read of what has been chosen, so the card says something
// useful without opening the prescription.
function summaryLine(key, config, schema) {
  if (!schema) return [config.material, config.shade].filter(Boolean).join(' • ');
  const fields = fieldsOf(schema, key);
  return ['restorationSubtype', 'restorationType', 'applianceType', 'material', 'shade', 'ponticType']
    .map(name => { const f = fields.find(x => x.key === name); return f && config[name] ? labelFor(f, config[name]) : ''; })
    .filter(Boolean).slice(0, 4).join(' • ');
}

export function SelectedServicesSummary(teeth, configs = {}, activeKey = '', schema = null, extras = []) {
  const groups = groupServices(teeth, schema, extras);
  if (!groups.length) return '<div class="active-prescriptions-empty">No active prescriptions yet. Select teeth on the chart and assign a restoration, or add an appliance for a whole arch.</div>';
  return '<div class="selected-services active-prescriptions-list">' + groups.map(g => {
    const c = configs[g.key] || {}, s = prescriptionStatus(g.key, c, schema);
    const summary = summaryLine(g.key, c, schema);
    const scope = g.selection === 'arch'
      ? ({ upper: 'Upper arch', lower: 'Lower arch', both: 'Both arches' })[c.arch] || 'Arch not chosen'
      : g.teeth.length + ' ' + (g.teeth.length === 1 ? 'tooth' : 'teeth');
    return '<article class="selected-service-card prescription-card' + (activeKey === g.key ? ' active' : '') +
      '" data-service-summary="' + g.key + '"><div class="service-card-mark" data-service="' + g.key + '">' + esc(g.mark) + '</div><div>' +
      '<span class="service-card-kicker">' + esc(g.label) + '</span><h3>' + esc(scope) + '</h3>' +
      '<p>' + (g.teeth.length ? g.teeth.join(' · ') : esc(g.restoration)) + '</p>' +
      (summary ? '<small>' + esc(summary) + '</small>' : '') +
      '<strong class="prescription-status ' + s.state + '">' + s.icon + ' ' + esc(s.label) + '</strong></div>' +
      '<div class="prescription-actions"><button type="button" aria-label="Edit ' + esc(g.label) + ' prescription" title="Edit prescription" data-configure-service="' + g.key + '">✎</button>' +
      '<button type="button" aria-label="Delete ' + esc(g.label) + ' prescription" title="Delete prescription" data-delete-prescription="' + g.key + '">×</button></div></article>';
  }).join('') + '</div>';
}
