// Technician dashboard — wired to the real workflow backend.
import { UI } from '../state.js';
import { esc, fmtDateTime } from '../utils/format.js';
import { jobTypeLabel, statusPill } from '../utils/workflow.js';
import { listOrders, listStaff, productionDone } from '../utils/ordersApi.js';
import { showOrderDetail } from '../components/orderDetail.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';

// What a technician actually does depends on the job — a night guard is
// printed and cleaned, a crown is milled and glazed. Client-side only
// (there's no production_steps table — this is a checklist to work
// through before hitting "production done", not data the backend needs
// to track per-step; the backend only cares about the single
// in_production -> production_done transition).
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
const PROGRESS = {}; // per-order-id checklist state, resets on page reload — see note above

function stepsFor(o) { return PRODUCTION_STEPS[o.job_type] || PRODUCTION_STEPS.other; }
let qcOptions = [];

function detail(o) {
  const steps = stepsFor(o);
  const done = PROGRESS[o.id] || {};
  const allDone = steps.every(s => done[s]);
  return '<div class="card reveal" style="margin-top:14px;">' +
    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">' +
      '<div><h3 style="margin-bottom:2px;">' + o.order_number + ' · ' + esc(jobTypeLabel(o.job_type)) + '</h3><p>' + esc(o.patient_ref) + (o.shade ? ' · Shade ' + esc(o.shade) : '') + '</p></div>' +
      statusPill(o.status) +
    '</div><button class="btn btn-ghost" data-order-detail="' + o.id + '">Requirements, files &amp; notes</button>' +
    '<div class="drawer-sec" style="margin-top:20px;"><h4>Production steps</h4><div class="qc-checklist">' +
      steps.map(s => '<button type="button" class="qc-item' + (done[s] ? ' checked' : '') + '" aria-pressed="' + !!done[s] + '" data-tech-step="' + s + '" data-order="' + o.id + '">' +
        '<span class="qc-chk">' + (done[s] ? '✓' : '') + '</span><span class="lbl">' + s + '</span></button>'
      ).join('') +
    '</div></div>' +
    '<div class="drawer-actions" style="margin-top:20px; border-top:1px solid var(--line); padding-top:18px; background:none; flex-wrap:wrap;">' +
      '<select aria-label="Choose a quality inspector" id="qcPick" style="font-size:13px; padding:9px 12px; border-radius:9px; border:1px solid var(--line);"><option value="">Choose a QC reviewer…</option>' +
        qcOptions.map(q => '<option value="' + q.id + '">' + esc(q.name) + '</option>').join('') + '</select>' +
      '<button class="btn btn-gold" data-tech-done="' + o.id + '"' + (allDone ? '' : ' disabled') + '>Mark production done → send to QC</button>' +
      '<span data-checklist-hint' + (allDone ? ' hidden' : '') + '>Finish every applicable step to continue.</span>' +
      '<button class="btn btn-ghost" data-tech-close="1">Close</button>' +
    '</div>' +
  '</div>';
}

export async function renderTechnician() {
  let orders = [];
  try {
    const [ordersRes, qcRes] = await Promise.all([listOrders('technician'), listStaff('technician', 'qc')]);
    orders = ordersRes.orders.filter(o => o.status === 'in_production'); qcOptions = qcRes.staff;
  } catch (e) {
    return '<div class="page"><div class="u"><div class="page-head reveal"><span class="eyebrow-accent">Lab · Technician</span><h1 style="font-size:1.9rem;">Production queue</h1></div>' +
      '<div class="empty-note">Couldn\'t reach the workflow backend (' + esc(e.message) + ').</div></div></div>';
  }

  const openId = UI.technicianOpenId && orders.some(c => c.id === UI.technicianOpenId) ? UI.technicianOpenId : null;
  const inProduction = orders.filter(c => c.status === 'in_production').length;

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Lab · Technician</span><h1 style="font-size:1.9rem;">Production queue</h1>' +
      '<p class="lede">What needs to be made, step by step, for every case in your hands.</p></div>' +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + orders.length + '</div><div class="l">In your queue</div></div>' +
      '<div class="stat-card"><div class="n">' + inProduction + '</div><div class="l">In production</div></div>' +
    '</div>' +
    (orders.length ? '<div class="case-list reveal">' + orders.map(o => {
      const steps = stepsFor(o); const done = PROGRESS[o.id] || {};
      const doneCount = steps.filter(s => done[s]).length;
      return '<div class="case-card">' +
        '<div class="cc-top"><div><div class="cc-id">' + o.order_number + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + '</div></div>' + statusPill(o.status) + '</div>' +
        '<div class="cc-title">' + esc(o.patient_ref) + (o.shade ? ' · Shade ' + esc(o.shade) : '') + '</div>' +
        '<div class="progress-mini" style="margin-top:10px;">' + steps.map((s, i) => '<i class="' + (i < doneCount ? 'done' : '') + '"></i>').join('') + '</div>' +
        '<div class="cc-foot"><span style="font-size:11.5px; color:var(--ink-soft);">' + doneCount + ' of ' + steps.length + ' steps done</span>' +
        '<button class="btn btn-ghost btn-sm" data-tech-open="' + o.id + '">' + (openId === o.id ? 'Close' : 'Open case') + '</button></div>' +
      '</div>';
    }).join('') + '</div>' : '<div class="empty-note">Nothing in your queue right now.</div>') +
    (openId ? detail(orders.find(c => c.id === openId)) : '') +
  '</div></div>';
}

export function attachTechnicianHandlers() {
  document.querySelectorAll('[data-order-detail]').forEach(b => b.addEventListener('click', () => showOrderDetail('technician', b.dataset.orderDetail)));
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
    b.classList.toggle('checked',PROGRESS[id][step]); b.setAttribute('aria-pressed',String(PROGRESS[id][step])); b.querySelector('.qc-chk').textContent=PROGRESS[id][step]?'✓':'';
    const ready=[...document.querySelectorAll('[data-tech-step]')].every(el=>el.getAttribute('aria-pressed')==='true');
    document.querySelector('[data-tech-done]').disabled=!ready;
    document.querySelector('[data-checklist-hint]').hidden=ready;
  }));
  document.querySelectorAll('[data-tech-done]').forEach(b => b.addEventListener('click', async () => {
    const qcPick = document.getElementById('qcPick');
    const qcId = qcPick ? qcPick.value : '';
    if (!qcId) { toast('Choose a QC reviewer first.'); return; }
    try {
      const res = await productionDone(b.dataset.techDone, qcId);
      toast(res.order.order_number + ' production done — sent to QC.');
      renderCurrent();
    } catch (e) { toast(e.message); }
  }));
}
