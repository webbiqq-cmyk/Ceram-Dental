// Technician dashboard — design preview (see reception.js's header comment).
import { UI } from '../state.js';
import { esc, fmtDateTime } from '../utils/format.js';
import { MOCK_ORDERS, jobTypeLabel, statusPill } from '../utils/mockWorkflow.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';

// What a technician actually does depends on the job — a night guard is
// printed and cleaned, a crown is milled and glazed. One small lookup
// instead of a generic "production steps" that means nothing per job.
const PRODUCTION_STEPS = {
  veneers: ['Model', 'Milling', 'Layering', 'Glazing', 'Fitting check'],
  crowns: ['Model', 'Milling', 'Glazing', 'Fitting check'],
  bridges: ['Model', 'Milling', 'Layering', 'Glazing', 'Fitting check'],
  implant_crown: ['Model', 'Milling', 'Abutment fit', 'Glazing', 'Fitting check'],
  implant_bridge: ['Model', 'Milling', 'Abutment fit', 'Layering', 'Fitting check'],
  night_guard: ['Model', 'Printing', 'Cleaning', 'Fitting check'],
  bleaching_tray: ['Model', 'Printing', 'Cleaning'],
  essix_retainer: ['Model', 'Printing', 'Trimming', 'Cleaning'],
  surgical_guide: ['Model', 'Printing', 'Cleaning', 'Fitting check'],
  ortho_work: ['Model', 'Printing', 'Cleaning', 'Fitting check'],
  functional_mockup: ['Model', 'Milling', 'Fitting check'],
  other: ['Model', 'Fabrication', 'Fitting check']
};
// Which of the steps above are already done for a given order — keyed by
// order id then step name, defaulting to "not started" for anything unset.
const PROGRESS = { 'JO-0996': { Model: true, Printing: true }, 'JO-0993': { Model: true } };

function queue() { return MOCK_ORDERS.filter(o => ['assigned_to_technician', 'in_production'].includes(o.status)); }

function stepsFor(o) { return PRODUCTION_STEPS[o.jobType] || PRODUCTION_STEPS.other; }

function detail(o) {
  const steps = stepsFor(o);
  const done = PROGRESS[o.id] || {};
  const allDone = steps.every(s => done[s]);
  return '<div class="card reveal" style="margin-top:14px;">' +
    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">' +
      '<div><h3 style="margin-bottom:2px;">' + o.id + ' · ' + esc(jobTypeLabel(o.jobType)) + '</h3><p>' + esc(o.clinic) + ' · ' + esc(o.patient) + ' · Shade ' + esc(o.shade) + '</p></div>' +
      statusPill(o.status) +
    '</div>' +
    '<div class="drawer-sec" style="margin-top:20px;"><h4>Production steps</h4><div class="qc-checklist">' +
      steps.map(s => '<div class="qc-item' + (done[s] ? ' checked' : '') + '" data-tech-step="' + s + '" data-order="' + o.id + '">' +
        '<span class="qc-chk">' + (done[s] ? '✓' : '') + '</span><span class="lbl">' + s + '</span></div>'
      ).join('') +
    '</div></div>' +
    '<div class="drawer-actions" style="margin-top:20px; border-top:1px solid var(--line); padding-top:18px; background:none;">' +
      '<button class="btn btn-gold" data-tech-done="' + o.id + '"' + (allDone ? '' : ' disabled') + '>Mark production done → send to QC</button>' +
      (allDone ? '' : '<span style="font-size:12px; color:var(--ink-soft); align-self:center;">Finish every step to continue</span>') +
      '<button class="btn btn-ghost" data-tech-close="1">Close</button>' +
    '</div>' +
  '</div>';
}

export function renderTechnician() {
  const cases = queue();
  const openId = UI.technicianOpenId && cases.some(c => c.id === UI.technicianOpenId) ? UI.technicianOpenId : null;
  const inProduction = cases.filter(c => c.status === 'in_production').length;

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Lab · Technician</span><h1 style="font-size:1.9rem;">Production queue</h1>' +
      '<p class="lede">What needs to be made, step by step, for every case in your hands.</p></div>' +
    '<div class="empty-note" style="text-align:left; background:var(--gold-soft); border:1px solid color-mix(in srgb, var(--gold) 30%, var(--line)); border-radius:12px; padding:14px 16px; margin-bottom:24px;"><b style="color:var(--gold);">Design preview</b> — sample data; wires to the real workflow backend once Phase 2 lands.</div>' +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + cases.length + '</div><div class="l">In your queue</div></div>' +
      '<div class="stat-card"><div class="n">' + inProduction + '</div><div class="l">In production</div></div>' +
    '</div>' +
    (cases.length ? '<div class="case-list reveal">' + cases.map(o => {
      const steps = stepsFor(o); const done = PROGRESS[o.id] || {};
      const doneCount = steps.filter(s => done[s]).length;
      return '<div class="case-card">' +
        '<div class="cc-top"><div><div class="cc-id">' + o.id + '</div><div class="cc-type">' + esc(jobTypeLabel(o.jobType)) + '</div></div>' + statusPill(o.status) + '</div>' +
        '<div class="cc-title">' + esc(o.clinic) + '</div><div class="cc-sub">' + esc(o.patient) + ' · Shade ' + esc(o.shade) + '</div>' +
        '<div class="progress-mini" style="margin-top:10px;">' + steps.map((s, i) => '<i class="' + (i < doneCount ? 'done' : '') + '"></i>').join('') + '</div>' +
        '<div class="cc-foot"><span style="font-size:11.5px; color:var(--ink-soft);">' + doneCount + ' of ' + steps.length + ' steps done</span>' +
        '<button class="btn btn-ghost btn-sm" data-tech-open="' + o.id + '">' + (openId === o.id ? 'Close' : 'Open case') + '</button></div>' +
      '</div>';
    }).join('') + '</div>' : '<div class="empty-note">Nothing in your queue right now.</div>') +
    (openId ? detail(cases.find(c => c.id === openId)) : '') +
  '</div></div>';
}

export function attachTechnicianHandlers() {
  document.querySelectorAll('[data-tech-open]').forEach(b => b.addEventListener('click', () => {
    UI.technicianOpenId = UI.technicianOpenId === b.dataset.techOpen ? null : b.dataset.techOpen;
    renderCurrent();
  }));
  const closeBtn = document.querySelector('[data-tech-close]');
  if (closeBtn) closeBtn.addEventListener('click', () => { UI.technicianOpenId = null; renderCurrent(); });
  document.querySelectorAll('[data-tech-step]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.order, step = b.dataset.techStep;
    PROGRESS[id] = PROGRESS[id] || {};
    PROGRESS[id][step] = !PROGRESS[id][step];
    renderCurrent();
  }));
  document.querySelectorAll('[data-tech-done]').forEach(b => b.addEventListener('click', () => {
    const o = MOCK_ORDERS.find(x => x.id === b.dataset.techDone);
    if (o) { o.status = 'qc_pending'; toast(o.id + ' production done — sent to QC.'); renderCurrent(); }
  }));
}
