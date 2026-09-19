import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { JOB_TYPES, jobTypeLabel } from '../utils/workflow.js';
import { createOrder, createDraft, saveDraft, deleteDraft } from '../utils/ordersApi.js';
import { toast } from '../toast.js';
import { uploadZoneHtml, attachUploadZone } from '../components/caseUpload.js';
import { DentalChart, FDI_ARCHES, quickRangeTeeth } from '../components/dentalChart.js';
import { DentalServiceToolbar } from '../components/dentalServiceToolbar.js';
import { DentalLegend } from '../components/dentalLegend.js';
import { SelectedServicesSummary, groupServices, prescriptionStatus, treatmentMeta } from '../components/selectedServicesSummary.js';
import { ServiceConfigurationShell } from '../components/serviceConfigurationShell.js';
import { ReviewSummary } from '../components/reviewSummary.js';
import { toothMeta } from '../components/toothMetadata.js';
import { renderCurrent, repaintCurrent } from '../router.js';
import { ensureSchema, loadedSchema, missingRequired, jobTypeFor, sanitise, fieldsOf, isActive, labelFor } from '../utils/prescriptionSchema.js';

const STEPS = ['Case details', 'Dental prescription', 'Review & submit'];
const ALL_TEETH = FDI_ARCHES.flatMap(arch => arch.teeth);

// job_orders columns that the form collects alongside the prescription.
// They are not catalogue fields — they are indexed columns the lab has
// always searched on — so they survive sanitising untouched.
const COLUMN_FIELDS = ['implantSystem', 'scanBody', 'abutmentSize', 'abutmentAvailability'];

// Treatments start with nothing chosen. A pre-filled material or finish
// is a clinical decision nobody made, and it reaches the bench looking
// exactly like one that was.
function freshForm(seed = {}) {
  return {
    patientRef: seed.patientRef || '', caseKind: 'New case', deliveryMethod: seed.deliveryMethod || 'pickup',
    targetDate: '', step: 0,
    teeth: ALL_TEETH.map(number => ({ number, service: 'none', selected: false })),
    configs: {}, extras: [], activeConfigIndex: 0, createdOrders: [], submissionComplete: false, submissionError: ''
  };
}

// Anything the catalogue does not recognise is dropped here rather than
// at submit time — see prescriptionSchema.sanitise for why a stale draft
// must not be able to fail a whole case.
function normalizeForm(form, schema) {
  if (!form || !Array.isArray(form.teeth)) form = freshForm(form || {});
  form.step = Number.isInteger(form.step) ? Math.min(2, Math.max(0, form.step > 2 ? 1 : form.step)) : 0;
  form.caseKind = form.caseKind || 'New case';
  form.deliveryMethod = form.deliveryMethod || 'pickup';
  form.targetDate = form.targetDate || '';
  form.configs = form.configs || {};
  form.extras = Array.isArray(form.extras) ? form.extras : [];
  if (schema) {
    for (const key of Object.keys(schema.treatments)) {
      const raw = form.configs[key] || {};
      const clean = sanitise(schema, key, raw);
      for (const column of COLUMN_FIELDS) if (raw[column]) clean[column] = String(raw[column]).slice(0, 250);
      form.configs[key] = clean;
    }
    form.extras = form.extras.filter(key => (schema.treatments[key] || {}).selection === 'arch');
  }
  form.createdOrders = form.createdOrders || [];
  form.activeConfigIndex = form.activeConfigIndex || 0;
  // Autosave is on for every wizard session; the draft id appears once
  // the first save lands and then follows the form through re-renders.
  form.autosave = form.autosave !== false;
  form.draftId = form.draftId || null;
  return form;
}

function stepHeader(step) {
  return '<ol class="workspace-steps new-order-steps" aria-label="New case progress">' +
    STEPS.map((label, i) => '<li' + (i === step ? ' aria-current="step"' : '') + '><span>' + (i < step ? '✓' : i + 1) + '</span><em>' + label + '</em></li>').join('') + '</ol>';
}

function caseDetails(form) {
  return '<div class="new-order-intro"><span class="eyebrow-accent">Start with the essentials</span><h2>Who is this case for?</h2><p class="lede">Use a patient reference rather than a full name. Clinical choices come next.</p></div><div class="case-detail-panel"><div class="field full"><label for="order-patientRef">Patient reference *</label><input id="order-patientRef" data-order-field="patientRef" value="' + esc(form.patientRef) + '" maxlength="250" required autocomplete="off" placeholder="e.g. PT-1048"></div><fieldset class="segmented-field"><legend>Case type</legend><div><button type="button" data-case-kind="New case" aria-pressed="' + (form.caseKind === 'New case') + '">New</button><button type="button" data-case-kind="Redo" aria-pressed="' + (form.caseKind === 'Redo') + '">Redo</button></div></fieldset><div class="field full"><label for="order-deliveryMethod">Collection</label><select id="order-deliveryMethod" data-order-field="deliveryMethod"><option value="pickup"' + (form.deliveryMethod === 'pickup' ? ' selected' : '') + '>In-house pickup</option><option value="delivery"' + (form.deliveryMethod === 'delivery' ? ' selected' : '') + '>Delivery to your clinic</option></select></div><div class="field full"><label for="order-targetDate">Requested completion <span class="field-optional">Optional</span></label><input type="date" id="order-targetDate" data-order-field="targetDate" value="' + esc(form.targetDate || '') + '" min="' + new Date().toISOString().slice(0, 10) + '"><small class="field-hint">The lab works towards this date where it can. Reception will confirm what is achievable.</small></div></div><div class="workspace-notice">You will add the teeth, services and lab prescription in the following steps.</div>';
}

function inspector(form, schema) {
  const selected = form.teeth.filter(t => t.selected), groups = groupServices(form.teeth, schema, form.extras);
  const meta = treatmentMeta(schema);
  if (selected.length > 1) return '<aside class="prescription-inspector"><span class="service-card-kicker">Selected teeth</span><h3>' + selected.length + ' teeth selected</h3><ul>' + selected.map(t => '<li><strong>' + t.number + '</strong><span>' + esc(toothMeta(t.number).name) + '</span></li>').join('') + '</ul><p>Assign one restoration to this selection from the treatment controls.</p></aside>';
  if (selected.length === 1) {
    const t = selected[0], tm = toothMeta(t.number);
    const label = t.service === 'none' ? 'No treatment' : (meta[t.service] || {}).restoration || t.service;
    return '<aside class="prescription-inspector"><span class="service-card-kicker">Selected tooth</span><h3>FDI ' + t.number + '</h3><p>' + esc(tm.name) + '</p><dl><div><dt>Class</dt><dd>' + esc(tm.className) + '</dd></div><div><dt>Current prescription</dt><dd>' + esc(label) + '</dd></div></dl>' + (t.service !== 'none' ? '<button type="button" class="btn btn-ghost btn-sm" data-configure-service="' + esc(t.service) + '">Open prescription</button><button type="button" class="text-button" data-remove-selected>Remove treatment</button>' : '') + '</aside>';
  }
  const active = groups[form.activeConfigIndex];
  const status = active ? prescriptionStatus(active.key, form.configs[active.key] || {}, schema) : null;
  return '<aside class="prescription-inspector"><span class="service-card-kicker">Dental prescription</span><h3>' + (active ? esc(active.label) : 'Treatment map') + '</h3><p>' + (active ? (active.selection === 'arch' ? 'Whole-arch appliance' : active.teeth.length + ' selected unit' + (active.teeth.length === 1 ? '' : 's')) : 'Select teeth to begin a prescription.') + '</p>' + (status ? '<strong class="prescription-status ' + status.state + '">' + status.icon + ' ' + esc(status.label) + '</strong>' : '') + '</aside>';
}

function prescriptionWorkspace(form, schema) {
  const selected = form.teeth.filter(t => t.selected).length;
  const groups = groupServices(form.teeth, schema, form.extras);
  form.activeConfigIndex = Math.min(form.activeConfigIndex, Math.max(0, groups.length - 1));
  const group = groups[form.activeConfigIndex];
  return '<div class="prescription-workspace"><div class="prescription-top"><div><span class="eyebrow-accent">Dental prescription</span><h2>Treatment map</h2><p class="lede">Select teeth, assign restorations, and complete the clinic-approved prescription without losing chart context.</p></div>' + DentalLegend(schema) + '</div>' +
    '<div class="prescription-grid"><main>' + DentalChart(form.teeth, schema) + DentalServiceToolbar(selected, schema, form.extras) +
    '<section class="active-prescriptions"><div class="review-section-head"><span class="review-label">Active prescriptions</span><strong>' + groups.length + '</strong></div>' +
    SelectedServicesSummary(form.teeth, form.configs, group ? group.key : '', schema, form.extras) + '</section></main>' + inspector(form, schema) + '</div>' +
    (group ? '<section class="inline-prescription-panel">' + ServiceConfigurationShell(group.key, group.teeth, form.configs[group.key] || {}, form.activeConfigIndex, groups.length, schema) + '</section>'
      : '<div class="workspace-notice">Assign a restoration to at least one tooth, or add a whole-arch appliance, to open prescription details.</div>') + '</div>';
}

function confirmation(form) {
  const incomplete = !!form.submissionError;
  return '<div class="page new-order-page"><div class="u"><div class="page-head"><div><span class="eyebrow-accent">' + (incomplete ? 'Case update' : 'Case created') + '</span><h1>' + (incomplete ? 'Some orders need attention.' : 'Your case is with reception.') + '</h1><p class="lede">' + (incomplete ? 'Created orders are listed below. No duplicate orders were sent.' : 'Attach supporting files to the relevant service order below.') + '</p></div></div><section class="wizard new-order-wizard confirmation-wizard"><div class="wiz-body">' + (incomplete ? '<p class="form-error" role="alert">' + esc(form.submissionError) + '</p>' : '') + '<div class="created-orders">' + form.createdOrders.map((row, index) => { const o = row.order; return '<article class="created-order"><header><div><span class="service-card-kicker">' + esc(row.label) + '</span><h2>' + esc(o.order_number) + '</h2><p>' + esc(jobTypeLabel(o.job_type)) + '</p></div><span class="created-check" aria-hidden="true">✓</span></header><details' + (form.createdOrders.length === 1 ? ' open' : '') + '><summary>Add supporting files</summary><div class="created-upload-grid">' + uploadZoneHtml('order-' + index + '-scan', 'Scan or reference file', 'STL, OBJ, PLY, PDF or image under 10 MB') + uploadZoneHtml('order-' + index + '-photo', 'Clinical or shade photo', 'Choose a photo from this case') + '</div></details></article>'; }).join('') + '</div>' + (incomplete ? '<div class="workspace-notice">Please contact reception with the patient reference to complete any missing service order safely.</div>' : '<div class="workspace-notice">Reception will check the details and payment status before assigning each order.</div>') + '</div><div class="wiz-foot"><button class="btn btn-ghost" id="newOrderAgain">Create another case</button><a class="btn btn-primary" href="#/portal" id="newOrderDone">View my cases</a></div></section></div></div>';
}

export async function renderNewOrder() {
  // The form is built from the clinic catalogue, so it waits for it. The
  // route is already async (router.js awaits mod.render()) and the
  // catalogue is fetched once per page load.
  let schema = null;
  try { schema = await ensureSchema(); } catch { /* fall through to the notice below */ }
  const form = UI.newOrderForm = normalizeForm(UI.newOrderForm, schema);
  if (form.submissionComplete || form.submissionError && form.createdOrders.length) return confirmation(form);
  if (!schema) {
    return '<div class="page new-order-page"><div class="u"><div class="case-alert case-alert-warning"><strong>The prescription sheet could not be loaded.</strong><p>Creating a case needs the clinic-approved options, so the form is not shown rather than shown incomplete.</p></div><button class="btn" id="retryPage">Retry</button></div></div>';
  }
  const body = [() => caseDetails(form), () => prescriptionWorkspace(form, schema), () => ReviewSummary(form, schema)][form.step]();
  const groups = groupServices(form.teeth, schema, form.extras);
  const submitLabel = form.step === 2 ? 'Submit to Ceram Lab' : 'Continue';
  const duplicated = form.duplicatedFrom
    ? '<div class="case-alert case-alert-info"><strong>Copied from ' + esc(form.duplicatedFrom) + '</strong>' +
      '<p>Treatment preferences were carried over. The patient reference, teeth, shade, files and dates were not — review everything before submitting.</p>' +
      (form.carriedInstructions ? '<p class="case-muted" style="margin-top:8px">Previous instructions, for reference: ' + esc(form.carriedInstructions) + '</p>' : '') +
      '</div>'
    : '';
  return '<div class="page new-order-page"><div class="u"><div class="page-head new-order-page-head"><div><span class="eyebrow-accent">Dentist workspace</span><h1>' +
    (form.draftId ? 'Continue your case' : 'Create a new case') + '</h1><p class="lede">A precise digital prescription, built tooth by tooth.</p></div></div>' +
    '<form class="wizard new-order-wizard" id="newOrderForm"><div class="wiz-body">' + stepHeader(form.step) + duplicated + body +
    '<p class="form-error" id="orderFormError" role="alert"></p></div>' +
    '<div class="wiz-foot">' +
      (form.step ? '<button class="btn btn-ghost" type="button" id="orderBack">Back</button>' : '<a class="btn btn-ghost" href="#/portal">Back to overview</a>') +
      '<span class="autosave" id="draftState" role="status" aria-live="polite">' + (form.draftId ? 'Draft saved' : '') + '</span>' +
      '<button class="btn btn-ghost" type="button" id="saveDraftBtn">Save draft</button>' +
      '<button class="btn btn-primary" type="submit"' + (form.step === 1 && !groups.length ? ' disabled' : '') + '>' + submitLabel + '</button>' +
    '</div></form></div></div>';
}
// ---------------------------------------------------------------- drafts
//
// A draft is the wizard form as it stands, stored server-side against the
// dentist. Saving one puts nothing on the lab floor: the lab has no
// endpoint that can read drafts, and only the Submit at the end of the
// wizard creates job orders. That separation is the whole safety
// argument, so nothing here ever calls createOrder.

let autosaveTimer = null;
let autosaveInFlight = false;
let lastSavedSnapshot = '';

// Only the parts a person actually filled in. Transient UI state (which
// config panel is open, the step they are on, a half-finished submission)
// is not worth a round trip and would make every draft look changed.
function draftPayload(form) {
  return {
    patientRef: form.patientRef, caseKind: form.caseKind, deliveryMethod: form.deliveryMethod,
    targetDate: form.targetDate || '', step: form.step,
    teeth: form.teeth.filter(t => t.service && t.service !== 'none').map(t => ({ number: t.number, service: t.service })),
    configs: form.configs, extras: form.extras,
    duplicatedFrom: form.duplicatedFrom || '',
    carriedInstructions: form.carriedInstructions || '', carriedJobType: form.carriedJobType || '',
    carriedShadePreference: form.carriedShadePreference || ''
  };
}

// Rebuilds a full wizard form from a stored payload. The tooth chart is
// always regenerated from the canonical arch rather than trusted from the
// draft, so a stale or hand-edited payload can never produce a chart with
// missing or invented teeth. Stored answers are checked against the
// catalogue on the next render (normalizeForm), which is where a draft
// saved before an option changed loses just that answer.
export function formFromDraft(draft) {
  const payload = draft.payload || {};
  const form = freshForm({ patientRef: payload.patientRef, deliveryMethod: payload.deliveryMethod });
  form.caseKind = payload.caseKind || 'New case';
  form.targetDate = payload.targetDate || '';
  form.step = Number.isInteger(payload.step) ? Math.min(2, Math.max(0, payload.step)) : 0;
  for (const saved of Array.isArray(payload.teeth) ? payload.teeth : []) {
    const tooth = form.teeth.find(t => t.number === saved.number);
    if (tooth && saved.service) tooth.service = saved.service;
  }
  form.configs = (payload.configs && typeof payload.configs === 'object') ? payload.configs : {};
  form.extras = Array.isArray(payload.extras) ? payload.extras : [];
  form.draftId = draft.id;
  form.duplicatedFrom = payload.duplicatedFrom || draft.originOrderNumber || '';
  form.carriedInstructions = payload.carriedInstructions || '';
  form.carriedJobType = payload.carriedJobType || '';
  form.carriedShadePreference = payload.carriedShadePreference || '';
  return normalizeForm(form, loadedSchema());
}

function setAutosaveState(text, saved) {
  const el = document.getElementById('draftState');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('is-saved', !!saved);
}

// Persists the current form, creating the draft on first save. Returns the
// draft id so an explicit "Save draft" can report success.
async function persistDraft(form) {
  const payload = draftPayload(form);
  const snapshot = JSON.stringify(payload);
  const draft = form.draftId
    ? (await saveDraft(form.draftId, payload)).draft
    : (await createDraft(payload)).draft;
  form.draftId = draft.id;
  lastSavedSnapshot = snapshot;
  return draft;
}

// Autosave is debounced and change-gated: it fires a couple of seconds
// after someone stops changing things, and only when the form actually
// differs from what was last stored. A keystroke is never a request, and
// an idle wizard never talks to the server at all.
function scheduleAutosave(form) {
  if (!form.autosave) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    if (autosaveInFlight) return;
    const payload = JSON.stringify(draftPayload(form));
    if (payload === lastSavedSnapshot) return;
    // Nothing to save until there is something worth saving.
    if (!form.patientRef.trim() && !form.teeth.some(t => t.service !== 'none') && !form.extras.length) return;
    autosaveInFlight = true;
    setAutosaveState('Saving…', false);
    try { await persistDraft(form); setAutosaveState('Draft saved', true); }
    catch { setAutosaveState('Could not save — use Save draft to retry', false); }
    finally { autosaveInFlight = false; }
  }, 2200);
}

function activeGroup(form, schema) {
  return groupServices(form.teeth, schema, form.extras)[form.activeConfigIndex] || null;
}

function readFields(form, schema) {
  document.querySelectorAll('[data-order-field]').forEach(el => { form[el.dataset.orderField] = el.value; });
  const active = activeGroup(form, schema);
  if (!active) return;
  const config = form.configs[active.key] = form.configs[active.key] || {};
  document.querySelectorAll('[data-config-field]').forEach(el => { config[el.dataset.configField] = el.value; });
}

function renderWithoutScrollJump() {
  const x = window.scrollX, y = window.scrollY;
  repaintCurrent();
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(x, y)));
}

// The same rules the server re-applies in prescription.normalise() and
// workflow.createOrder(). Checking here only buys a clearer message in
// the right place on the form.
function validateConfig(service, config, schema) {
  if (service === 'implant') {
    const columns = [['implantSystem', 'Implant type / platform'], ['scanBody', 'Scan body'], ['abutmentSize', 'Abutment size']]
      .filter(([key]) => !String(config[key] || '').trim());
    if (columns.length) return columns.map(([, label]) => label).join(', ') + ' ' + (columns.length === 1 ? 'is' : 'are') + ' required for implant cases.';
  }
  const missing = missingRequired(schema, service, config);
  if (!missing.length) return '';
  const fields = fieldsOf(schema, service);
  return missing.map(k => (fields.find(f => f.key === k) || { label: k }).label).join(', ') + ' ' + (missing.length === 1 ? 'is' : 'are') + ' required.';
}

function withOther(value, other) {
  const text = String(other || '').trim();
  return text && ['other', 'custom', 'specify', 'Other'].includes(value) ? text : value;
}

/**
 * The human-readable prescription, still written into job_orders.instructions.
 *
 * The structured copy in the `prescription` column is what the portal
 * renders; this stays because it is what a printed job sheet, an older
 * client and every case created before this change all read, and because
 * a case is a clinical record that should stay legible without the app.
 */
function serializeInstructions(form, group, schema) {
  const c = form.configs[group.key] || {};
  const treatment = schema.treatments[group.key];
  const lines = ['DENTAL PRESCRIPTION', '', 'RESTORATION: ' + treatment.label.toUpperCase(), '', 'CASE: ' + form.caseKind];
  if (group.selection === 'arch') {
    lines.push('', 'ARCH', ({ upper: 'Upper arch', lower: 'Lower arch', both: 'Upper and lower arches' })[c.arch] || 'Not specified');
  } else {
    lines.push('', 'TEETH');
    group.teeth.forEach(number => lines.push(number + ' - ' + toothMeta(number).name));
  }
  for (const section of treatment.sections) {
    const rows = section.fields.filter(f => isActive(f, c) && c[f.key] !== undefined && c[f.key] !== '' && !(Array.isArray(c[f.key]) && !c[f.key].length));
    if (!rows.length) continue;
    lines.push('', section.title.toUpperCase());
    for (const field of rows) {
      const value = c[field.other] && ['other', 'custom', 'specify', 'Other'].includes(c[field.key])
        ? labelFor(field, c[field.key]) + ': ' + c[field.other]
        : labelFor(field, c[field.key]);
      lines.push('  ' + field.label + ': ' + value);
    }
  }
  const columns = [['Implant type / platform', c.implantSystem], ['Scan body', c.scanBody], ['Abutment size', c.abutmentSize], ['Abutment availability', c.abutmentAvailability]].filter(([, v]) => v);
  if (columns.length) { lines.push('', 'IMPLANT RECORD'); columns.forEach(([k, v]) => lines.push('  ' + k + ': ' + v)); }
  if (c.notes && c.notes.trim()) lines.push('', 'CLINICAL INSTRUCTIONS', c.notes.trim());
  return lines.join('\n');
}

function orderBody(form, group, schema) {
  const c = form.configs[group.key] || {};
  const implant = group.key === 'implant';
  const prescription = { ...sanitise(schema, group.key, c), treatment: group.key };
  if (group.teeth.length) prescription.teeth = group.teeth;
  const jobType = jobTypeFor(schema, group.key, c);
  if (!JOB_TYPES.some(j => j.key === jobType)) throw new Error('Unsupported service type.');
  return {
    patientRef: form.patientRef.trim(), jobType,
    shade: withOther(c.shade, c.shadeOther) || '',
    instructions: serializeInstructions(form, group, schema),
    scanBody: implant ? c.scanBody || '' : '', implantSystem: implant ? c.implantSystem || '' : '',
    abutmentSize: implant ? c.abutmentSize || '' : '', abutmentAvailability: implant ? c.abutmentAvailability || '' : '',
    deliveryMethod: form.deliveryMethod, targetDate: form.targetDate || null,
    prescription
  };
}

export function attachNewOrderHandlers() {
  const form = UI.newOrderForm;
  const schema = loadedSchema();
  if (form.submissionComplete || form.submissionError && form.createdOrders.length) {
    form.createdOrders.forEach((row, index) => { const o = row.order; attachUploadZone(document, 'order-' + index + '-scan', { role: 'dentist', orderId: o.id, stageType: o.stage_type, category: 'scan' }); attachUploadZone(document, 'order-' + index + '-photo', { role: 'dentist', orderId: o.id, stageType: o.stage_type, category: 'photo' }); });
    document.getElementById('newOrderAgain')?.addEventListener('click', () => { UI.newOrderForm = freshForm(); renderCurrent(); });
    document.getElementById('newOrderDone')?.addEventListener('click', () => { UI.portalTab = 'orders'; UI.portalFilter = 'all'; UI.newOrderForm = null; });
    return;
  }
  if (!schema) return;

  const configOf = key => (form.configs[key] = form.configs[key] || {});

  document.querySelectorAll('[data-order-field],[data-config-field]').forEach(el => el.addEventListener('input', () => { readFields(form, schema); scheduleAutosave(form); }));
  document.getElementById('saveDraftBtn')?.addEventListener('click', async event => {
    readFields(form, schema);
    if (!form.patientRef.trim() && !form.teeth.some(t => t.service !== 'none') && !form.extras.length) {
      toast('Add a patient reference or a treatment before saving a draft.');
      return;
    }
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await persistDraft(form);
      setAutosaveState('Draft saved', true);
      toast('Draft saved. Continue it any time from your overview.');
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  });
  document.querySelectorAll('[data-case-kind]').forEach(button => button.addEventListener('click', () => { form.caseKind = button.dataset.caseKind; renderCurrent(); }));
  document.querySelectorAll('[data-tooth]').forEach(button => button.addEventListener('click', () => { const tooth = form.teeth.find(t => t.number === Number(button.dataset.tooth)); tooth.selected = !tooth.selected; renderWithoutScrollJump(); }));

  // "3–3", "6–6", whole arch — the selections a dentist says out loud.
  // They replace that arch's selection rather than adding to it, so a
  // second click on a different range is a correction, not a pile-up.
  document.querySelectorAll('[data-quick-range]').forEach(button => button.addEventListener('click', () => {
    const [archKey, range] = button.dataset.quickRange.split(':');
    const arch = FDI_ARCHES.find(a => a.key === archKey);
    const wanted = range === 'none' ? [] : quickRangeTeeth(archKey, range);
    form.teeth.forEach(t => { if (arch.teeth.includes(t.number)) t.selected = wanted.includes(t.number); });
    renderWithoutScrollJump();
  }));

  document.querySelectorAll('[data-assign-service]').forEach(button => button.addEventListener('click', () => {
    const service = button.dataset.assignService;
    form.teeth.filter(t => t.selected).forEach(t => { t.service = service; t.selected = false; });
    const i = groupServices(form.teeth, schema, form.extras).findIndex(g => g.key === service);
    if (i >= 0) form.activeConfigIndex = i;
    scheduleAutosave(form); renderWithoutScrollJump();
  }));

  // An arch appliance covers a whole arch, so it is added to the case
  // rather than assigned to teeth — which arch is the first question on
  // its own prescription.
  document.querySelectorAll('[data-add-arch-service]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.addArchService;
    if (!form.extras.includes(key)) form.extras.push(key);
    const i = groupServices(form.teeth, schema, form.extras).findIndex(g => g.key === key);
    if (i >= 0) form.activeConfigIndex = i;
    scheduleAutosave(form); renderWithoutScrollJump();
  }));

  document.querySelector('[data-remove-selected]')?.addEventListener('click', () => { form.teeth.filter(t => t.selected).forEach(t => { t.service = 'none'; }); renderWithoutScrollJump(); });
  document.querySelectorAll('[data-delete-prescription]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    const key = button.dataset.deletePrescription;
    form.teeth.forEach(t => { if (t.service === key) { t.service = 'none'; t.selected = false; } });
    form.extras = form.extras.filter(k => k !== key);
    delete form.configs[key];
    form.activeConfigIndex = 0; scheduleAutosave(form); renderWithoutScrollJump();
  }));
  document.querySelectorAll('[data-configure-service],[data-service-summary]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    const service = button.dataset.configureService || button.dataset.serviceSummary;
    const index = groupServices(form.teeth, schema, form.extras).findIndex(g => g.key === service);
    if (index >= 0) form.activeConfigIndex = index;
    renderWithoutScrollJump();
  }));

  // Option controls all write into the active treatment's answers. Text
  // already on screen is read first so a click never discards a
  // half-typed "specify" box.
  document.querySelectorAll('[data-option-group]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const active = activeGroup(form, schema); if (!active) return;
    readFields(form, schema);
    configOf(active.key)[button.dataset.optionGroup] = button.dataset.optionValue;
    scheduleAutosave(form); renderWithoutScrollJump();
  }));
  document.querySelectorAll('[data-option-multi]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const active = activeGroup(form, schema); if (!active) return;
    readFields(form, schema);
    const config = configOf(active.key), key = button.dataset.optionMulti;
    const list = Array.isArray(config[key]) ? config[key] : [];
    config[key] = list.includes(button.dataset.optionValue) ? list.filter(v => v !== button.dataset.optionValue) : list.concat(button.dataset.optionValue);
    scheduleAutosave(form); renderWithoutScrollJump();
  }));
  document.querySelectorAll('[data-option-toggle]').forEach(box => box.addEventListener('change', () => {
    const active = activeGroup(form, schema); if (!active) return;
    readFields(form, schema);
    configOf(active.key)[box.dataset.optionToggle] = box.checked;
    scheduleAutosave(form); renderWithoutScrollJump();
  }));

  document.querySelectorAll('[data-edit-step]').forEach(button => button.addEventListener('click', () => { form.step = Number(button.dataset.editStep); renderCurrent(); }));
  document.getElementById('orderBack')?.addEventListener('click', () => { readFields(form, schema); form.step--; renderCurrent(); });
  document.getElementById('newOrderForm')?.addEventListener('submit', async event => {
    event.preventDefault(); readFields(form, schema);
    const error = document.getElementById('orderFormError');
    if (form.step === 0 && !form.patientRef.trim()) { error.textContent = 'Patient reference is required.'; document.getElementById('order-patientRef')?.focus(); return; }
    const groups = groupServices(form.teeth, schema, form.extras);
    if (form.step === 1 && !groups.length) { error.textContent = 'Assign a restoration to at least one tooth, or add a whole-arch appliance.'; return; }
    if (form.step < 2) { form.step++; renderCurrent(); return; }
    for (const group of groups) {
      const message = validateConfig(group.key, form.configs[group.key] || {}, schema);
      if (message) {
        form.activeConfigIndex = groups.indexOf(group); form.step = 1;
        await renderCurrent();
        document.getElementById('orderFormError').textContent = group.label + ': ' + message;
        return;
      }
    }
    const button = event.target.querySelector('[type=submit]');
    button.disabled = true; button.textContent = 'Creating orders…';
    form.createdOrders = []; form.submissionError = '';
    // Stop any pending autosave from writing the form back after it has
    // already been submitted.
    form.autosave = false; clearTimeout(autosaveTimer);
    try {
      for (const group of groups) { const { order } = await createOrder(orderBody(form, group, schema)); form.createdOrders.push({ service: group.key, label: group.label, order }); }
      form.submissionComplete = true;
      // The draft has become real cases; leaving it behind would invite
      // someone to submit the same work twice.
      if (form.draftId) { try { await deleteDraft(form.draftId); } catch { /* the cases exist; a stale draft is the lesser problem */ } form.draftId = null; }
      renderCurrent();
    }
    catch (err) { form.submissionError = 'The remaining service orders could not be created: ' + err.message; renderCurrent(); }
  });
}
