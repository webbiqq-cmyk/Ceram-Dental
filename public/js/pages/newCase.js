import { UI, api, loadState } from '../state.js';
import { esc, money, val, svcLabel } from '../utils/format.js';
import {
  SERVICES, SVC, PROTOCOL, LAYERING_STYLES, GLAZE_TYPES, SURFACE_TEXTURES,
  SHADES, RESTORATION_TYPES, FABRICATION, INCISAL_DESIGNS
} from '../constants.js';
import { isRestoration, shadeCombo, toothVizHtml } from '../utils/design.js';
import { footer } from '../components/footer.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';
import { newIdempotencyKey } from '../utils/idempotency.js';

function freshWizard(preService) {
  return {
    step: 0, service: preService || null,
    clinic: 'Dr. R. Haddad — Bright Smile Clinic', patient: '',
    material: RESTORATION_TYPES[0], fabrication: FABRICATION[0], incisal: INCISAL_DESIGNS[0],
    layering: LAYERING_STYLES[0], glaze: GLAZE_TYPES[0], surface: SURFACE_TEXTURES[0],
    shadeCervical: '—', shadeBody: 'A2', shadeIncisal: '—',
    instructions: '', protocol: { photos: false, scan: false, retraction: false, margins: false, contacts: false }
  };
}

function row(k, v) { return '<div class="review-row"><div class="k">' + k + '</div><div class="v">' + esc(v) + '</div></div>'; }
function selectField(id, label, options, value) {
  return '<div class="field"><label>' + label + '</label><select id="' + id + '">' + options.map(o => '<option ' + (o === value ? 'selected' : '') + '>' + o + '</option>').join('') + '</select></div>';
}

function syncWizardDesign() {
  const w = UI.wizard;
  if (!w || !isRestoration(w.service) || !document.getElementById('w-material')) return;
  w.material = val('w-material'); w.fabrication = val('w-fabrication'); w.incisal = val('w-incisal');
  w.layering = val('w-layering'); w.glaze = val('w-glaze'); w.surface = val('w-surface');
  w.shadeCervical = val('w-shade-cervical'); w.shadeBody = val('w-shade-body'); w.shadeIncisal = val('w-shade-incisal');
}

export function renderNewCase() {
  if (!UI.wizard) UI.wizard = freshWizard();
  const w = UI.wizard;
  const stepsLabels = ['Service', 'Case Details', 'Protocol', 'Review'];
  const stepsHtml = stepsLabels.map((s, i) => {
    const cls = i === w.step ? 'active' : (i < w.step ? 'done' : '');
    return '<div class="wiz-step ' + cls + '">' + (i + 1) + ' · ' + s + '</div>';
  }).join('');

  let body = '', foot = '';
  if (w.step === 0) {
    body = '<div class="svc-pick-grid">' + SERVICES.map(s =>
      '<button class="svc-pick' + (w.service === s.key ? ' selected' : '') + '" data-pick-service="' + s.key + '"><div class="t">' + s.label + '</div><div class="d">' + s.desc + ' · from ' + money(s.fee) + '</div></button>'
    ).join('') + '</div>';
    foot = '<span></span><button class="btn btn-primary" id="wiz-next" ' + (w.service ? '' : 'disabled') + '>Continue →</button>';
  } else if (w.step === 1) {
    const shadeOpt = ['—'].concat(SHADES);
    const designFields = isRestoration(w.service) ? (
      '<div class="wiz-group-label">Restoration design</div>' +
      '<div class="field full" id="toothVizWrap">' + toothVizHtml(w) + '</div>' +
      selectField('w-material', 'Restoration type', RESTORATION_TYPES, w.material) +
      selectField('w-fabrication', 'Fabrication', FABRICATION, w.fabrication) +
      selectField('w-incisal', 'Incisal design', INCISAL_DESIGNS, w.incisal) +
      selectField('w-layering', 'Layering style', LAYERING_STYLES, w.layering) +
      selectField('w-glaze', 'Glaze type', GLAZE_TYPES, w.glaze) +
      selectField('w-surface', 'Surface structure', SURFACE_TEXTURES, w.surface) +
      '<div class="wiz-group-label">Shade combination</div>' +
      selectField('w-shade-cervical', 'Cervical ⅓', shadeOpt, w.shadeCervical) +
      selectField('w-shade-body', 'Body ⅓', SHADES, w.shadeBody) +
      selectField('w-shade-incisal', 'Incisal ⅓', shadeOpt, w.shadeIncisal)
    ) : '';
    body = '<div class="field-grid">' +
      '<div class="field full"><label>Clinic / Doctor</label><input id="f-clinic" value="' + esc(w.clinic) + '"></div>' +
      '<div class="field full"><label>Patient reference</label><input id="f-patient" placeholder="e.g. Patient #4521" value="' + esc(w.patient) + '"></div>' +
      designFields +
      '<div class="field full"><label>Design notes / special instructions</label><textarea id="f-instr" placeholder="Anything else the design team should know…">' + esc(w.instructions) + '</textarea></div>' +
    '</div>';
    foot = '<button class="btn btn-ghost" id="wiz-back">← Back</button><button class="btn btn-primary" id="wiz-next">Continue →</button>';
  } else if (w.step === 2) {
    body = '<p style="color:var(--ink-soft); font-size:13.5px; margin-bottom:16px;">Same checklist our QC desk verifies on arrival — confirm what\'s included with this case.</p>' +
      '<div class="protocol-list">' + PROTOCOL.map(p => {
        const checked = w.protocol[p.key];
        return '<div class="protocol-item' + (checked ? ' checked' : '') + '" data-proto="' + p.key + '"><div class="chk">' + (checked ? '✓' : '') + '</div><div class="lbl">' + p.label + '</div><div class="up">' + (checked ? 'Attached (demo)' : 'Tap to attach') + '</div></div>';
      }).join('') + '</div>';
    foot = '<button class="btn btn-ghost" id="wiz-back">← Back</button><button class="btn btn-primary" id="wiz-next">Review →</button>';
  } else if (w.step === 3) {
    const protoDone = PROTOCOL.filter(p => w.protocol[p.key]).length;
    const designRows = isRestoration(w.service) ? (
      row('Restoration type', w.material + ' · ' + w.fabrication) +
      row('Incisal design', w.incisal) +
      row('Layering / Glaze / Surface', w.layering + ' · ' + w.glaze + ' · ' + w.surface) +
      row('Shade combination', shadeCombo({ cervical: w.shadeCervical, body: w.shadeBody, incisal: w.shadeIncisal }))
    ) : '';
    body = '<div class="review-block">' +
      row('Service', svcLabel(w.service)) + row('Clinic', w.clinic) + row('Patient', w.patient || '—') +
      designRows +
      row('Protocol items', protoDone + ' of ' + PROTOCOL.length + ' attached') +
      row('Estimated case fee', money(SVC[w.service] ? SVC[w.service].fee : 0)) +
      row('Notes', w.instructions || '—') +
    '</div>';
    foot = '<button class="btn btn-ghost" id="wiz-back">← Back</button><button class="btn btn-primary" id="wiz-submit">Submit case</button>';
  } else if (w.step === 4) {
    body = '<div class="confirm"><div class="check-mark">✓</div><h3>Case sent to Reception</h3><div class="cid">' + esc(w.newId || '') + '</div>' +
      '<p style="color:var(--ink-soft); max-width:40ch; margin:0 auto;">It\'ll appear in Lab Studio immediately, and you can follow it — plus its invoice — from the Dentist Portal.</p></div>';
    foot = '<button class="btn btn-ghost" id="wiz-again">Submit another</button><a class="btn btn-primary" href="#/portal">Track this case →</a>';
  }

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal" style="margin-bottom:26px;"><span class="eyebrow-accent">New case</span><h1 style="font-size:1.9rem;">Start a new case</h1></div>' +
    '<div class="wizard reveal"><div class="wiz-steps">' + stepsHtml + '</div><div class="wiz-body">' + body + '</div><div class="wiz-foot">' + foot + '</div></div>' +
  '</div></div>' + footer();
}

async function submitWizard() {
  const w = UI.wizard;
  const design = isRestoration(w.service) ? {
    material: w.material, fabrication: w.fabrication, incisal: w.incisal,
    layering: w.layering, glaze: w.glaze, surface: w.surface,
    shade: { cervical: w.shadeCervical, body: w.shadeBody, incisal: w.shadeIncisal }
  } : null;
  // One key for this submission, reused if the user retries after a
  // failure (a dropped connection right at submit shouldn't be able to
  // create the case twice) — fresh only the first time this wizard
  // instance attempts a submit.
  if (!w.submitKey) w.submitKey = newIdempotencyKey();
  try {
    const res = await api('/api/cases', { method: 'POST', headers: { 'Idempotency-Key': w.submitKey }, body: JSON.stringify({ clinic: w.clinic, patient: w.patient, service: w.service, shade: shadeCombo(design && design.shade) || w.shadeBody, instructions: w.instructions, protocol: w.protocol, design }) });
    w.newId = res.case.id;
    w.step = 4;
    await loadState();
    renderCurrent();
    toast('Case ' + res.case.id + ' sent to Reception');
  } catch (e) { toast(e.message); }
}

export function attachNewCaseHandlers() {
  document.querySelectorAll('[data-pick-service]').forEach(b => b.addEventListener('click', () => { UI.wizard.service = b.dataset.pickService; renderCurrent(); }));
  document.querySelectorAll('[data-proto]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.proto; UI.wizard.protocol[k] = !UI.wizard.protocol[k]; renderCurrent(); }));
  const nextBtn = document.getElementById('wiz-next');
  if (nextBtn) nextBtn.addEventListener('click', () => {
    const w = UI.wizard;
    if (w.step === 1) {
      w.clinic = val('f-clinic');
      w.patient = val('f-patient');
      w.instructions = val('f-instr');
      syncWizardDesign();
    }
    w.step++; renderCurrent();
  });
  const wizBody = document.querySelector('.wiz-body');
  if (wizBody && UI.wizard.step === 1) wizBody.addEventListener('change', e => {
    if (e.target.tagName !== 'SELECT') return;
    syncWizardDesign();
    const viz = document.getElementById('toothVizWrap');
    if (viz) viz.innerHTML = toothVizHtml(UI.wizard);
  });
  const backBtn = document.getElementById('wiz-back'); if (backBtn) backBtn.addEventListener('click', () => { UI.wizard.step--; renderCurrent(); });
  const submitBtn = document.getElementById('wiz-submit'); if (submitBtn) submitBtn.addEventListener('click', submitWizard);
  const againBtn = document.getElementById('wiz-again'); if (againBtn) againBtn.addEventListener('click', () => { UI.wizard = freshWizard(); renderCurrent(); });
}
