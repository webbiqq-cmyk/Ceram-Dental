// The prescription form for one treatment, built entirely from the
// server's catalogue.
//
// This file used to carry its own copy of every clinical option in a COPY
// object. That was four treatments' worth of labels that had to be kept
// in step with the validator by hand, and it is why the clinic's new
// sheets could not simply be added. Now the shape of the form comes from
// GET /api/prescription-schema: sections, fields, options, hints,
// conditionals and required flags are all read, never restated. Adding an
// option to src/services/prescription.js is enough to make it appear
// here, correctly validated.
import { esc } from '../utils/format.js';
import { ShadeSelector } from './shadeSelector.js';
import { toothMeta } from './toothMetadata.js';
import { OptionArt } from './prescriptionArt.js';
import { fieldsOf, isActive, wantsOther, missingRequired } from '../utils/prescriptionSchema.js';

function optionCard(field, option, selected, art) {
  const diagram = art ? OptionArt(art, option.value) : '';
  return '<button type="button" class="visual-option rx-option' + (selected ? ' selected' : '') + (diagram ? ' has-art' : '') +
    '" data-option-group="' + esc(field.key) + '" data-option-value="' + esc(option.value) +
    '" aria-pressed="' + String(selected) + '">' +
    (diagram || '<span class="visual-option-icon" aria-hidden="true">' + esc(option.label.slice(0, 1)) + '</span>') +
    '<span><strong>' + esc(option.label) + '</strong>' + (option.hint ? '<small>' + esc(option.hint) + '</small>' : '') + '</span>' +
    '<i aria-hidden="true">✓</i></button>';
}

function smileCard(field, option, selected) {
  return '<button type="button" class="visual-option rx-option rx-smile' + (selected ? ' selected' : '') +
    '" data-option-group="' + esc(field.key) + '" data-option-value="' + esc(option.value) +
    '" aria-pressed="' + String(selected) + '">' + OptionArt('smile', option.value) +
    '<span><strong>' + esc(option.value) + '</strong><small>' + esc(option.label) + '</small></span><i aria-hidden="true">✓</i></button>';
}

function otherInput(field, values) {
  return '<div class="field full prescription-other"><label for="config-' + esc(field.other) + '">Specify ' + esc(field.label.toLowerCase()) + '</label>' +
    '<input id="config-' + esc(field.other) + '" data-config-field="' + esc(field.other) + '" value="' + esc(values[field.other] || '') +
    '" maxlength="250" placeholder="Describe what you need"></div>';
}

function control(field, values, schema) {
  const value = values[field.key];
  if (field.type === 'shade') {
    return ShadeSelector(value || '', { name: field.key, classicShades: schema.classicShades, ndShades: schema.ndShades });
  }
  if (field.type === 'smile') {
    const groups = [['Feminine character', 'female'], ['Masculine character', 'male']];
    return groups.map(([title, category]) => '<div class="rx-smile-group"><span class="shade-group-label">' + title + '</span>' +
      '<div class="visual-option-grid rx-smile-grid">' +
      field.options.filter(o => o.category === category).map(o => smileCard(field, o, value === o.value)).join('') +
      '</div></div>').join('');
  }
  if (field.type === 'multi') {
    const list = Array.isArray(value) ? value : [];
    return '<div class="visual-option-grid">' + field.options.map(o =>
      '<button type="button" class="visual-option rx-option' + (list.includes(o.value) ? ' selected' : '') +
      '" data-option-multi="' + esc(field.key) + '" data-option-value="' + esc(o.value) +
      '" aria-pressed="' + String(list.includes(o.value)) + '"><span class="visual-option-icon" aria-hidden="true">' +
      esc(o.label.slice(0, 1)) + '</span><span><strong>' + esc(o.label) + '</strong></span><i aria-hidden="true">✓</i></button>').join('') + '</div>';
  }
  if (field.type === 'toggle') {
    return '<label class="workspace-check rx-toggle"><input type="checkbox" data-option-toggle="' + esc(field.key) + '"' +
      (value === true ? ' checked' : '') + '> ' + esc(field.label) + '</label>';
  }
  if (field.type === 'text') {
    return '<div class="field full"><input id="config-' + esc(field.key) + '" data-config-field="' + esc(field.key) +
      '" value="' + esc(value || '') + '" maxlength="250" placeholder="' + esc(field.placeholder || '') + '"></div>';
  }
  return '<div class="visual-option-grid">' + field.options.map(o => optionCard(field, o, value === o.value, field.art)).join('') + '</div>';
}

function fieldBlock(field, values, schema, required) {
  const isRequired = required.includes(field.key);
  const answered = field.type === 'multi' ? (values[field.key] || []).length : values[field.key] !== undefined && values[field.key] !== '';
  return '<div class="rx-field' + (field.type === 'toggle' ? ' rx-field-inline' : '') + '">' +
    (field.type === 'toggle' ? '' :
      '<div class="rx-field-head"><h4 id="rxf-' + esc(field.key) + '">' + esc(field.label) +
      (isRequired ? ' <em class="rx-required" title="Required">required</em>' : '') +
      (isRequired && !answered ? ' <em class="rx-pending">not chosen yet</em>' : '') + '</h4>' +
      (field.hint ? '<p class="rx-field-hint">' + esc(field.hint) + '</p>' : '') + '</div>') +
    control(field, values, schema) +
    (wantsOther(field, values) ? otherInput(field, values) : '') + '</div>';
}

/**
 * @param service   treatment key ('veneer', 'crown', …)
 * @param units     FDI tooth numbers, or arch keys for an arch treatment
 * @param config    the answers so far
 * @param schema    the loaded catalogue
 */
export function ServiceConfigurationShell(service, units, config, index, total, schema) {
  const treatment = schema.treatments[service];
  if (!treatment) return '<div class="workspace-notice">This treatment is no longer offered. Remove it and choose another.</div>';
  const values = config || {};
  const required = treatment.required;
  const missing = missingRequired(schema, service, values);
  const byArch = treatment.selection === 'arch';

  const chips = byArch
    ? '<span>' + esc(({ upper: 'Upper arch', lower: 'Lower arch', both: 'Both arches' })[values.arch] || 'Arch not chosen yet') + '</span>'
    : units.map(n => '<span title="' + esc(toothMeta(n).name) + '">FDI ' + n + '</span>').join('');
  const span = service === 'bridge' && units.length > 1
    ? '<p class="bridge-span">Selected span: ' + Math.min(...units) + ' – ' + Math.max(...units) + ', one shared prescription for the connected units.</p>' : '';

  const sections = treatment.sections.map(section => {
    const fields = section.fields.filter(f => isActive(f, values));
    if (!fields.length) return '';
    return '<section class="rx-section"><h3>' + esc(section.title) + '</h3>' +
      fields.map(f => fieldBlock(f, values, schema, required)).join('') + '</section>';
  }).join('');

  // The implant columns that already exist on job_orders keep their own
  // inputs — they are indexed, searchable fields the lab has always had,
  // not new prescription answers, so they are not moved into the JSONB.
  const implantColumns = service !== 'implant' ? '' :
    '<section class="rx-section"><h3>Implant record</h3>' +
    '<p class="rx-field-hint">These identify the fixture itself and travel with the case on the lab floor.</p>' +
    '<div class="field-grid config-fields">' +
    [['implantSystem', 'Implant type / platform', true], ['scanBody', 'Scan body', true],
     ['abutmentSize', 'Abutment size', true], ['abutmentAvailability', 'Abutment availability', false]]
      .map(([key, label, req]) => '<div class="field"><label for="config-' + key + '">' + label + (req ? ' *' : '') + '</label>' +
        '<input id="config-' + key + '" data-config-field="' + key + '" value="' + esc(values[key] || '') +
        '" maxlength="250"' + (req ? ' required' : '') + '></div>').join('') +
    '</div></section>';

  return '<div class="service-config"><header class="service-config-head"><div><span class="eyebrow-accent">Prescription ' + (index + 1) + ' of ' + total + '</span>' +
    '<h2>' + esc(treatment.label) + '</h2><p class="lede">' + esc(treatment.restoration) + ' — clinic-approved prescription sheet.</p></div>' +
    '<div class="selected-teeth-chip"><span>' + (byArch ? 'Arch' : 'Selected teeth') + '</span><strong>' +
    esc(byArch ? (({ upper: 'Upper', lower: 'Lower', both: 'Upper + lower' })[values.arch] || '—') : units.join(', ')) + '</strong></div></header>' +
    '<div class="prescription-teeth">' + chips + '</div>' + span +
    (missing.length ? '<div class="case-alert case-alert-warning rx-missing"><strong>' + missing.length + ' required answer' + (missing.length === 1 ? '' : 's') + ' outstanding</strong>' +
      '<p>' + esc(missing.map(k => (fieldsOf(schema, service).find(f => f.key === k) || { label: k }).label).join(', ')) + '</p></div>' : '') +
    sections + implantColumns +
    '<div class="field-grid config-fields"><div class="field full"><label for="config-notes">Clinical instructions</label>' +
    '<textarea id="config-notes" data-config-field="notes" maxlength="3000" placeholder="Anything the sheet does not cover — clinical details or special requests…">' +
    esc(values.notes || '') + '</textarea></div></div></div>';
}
