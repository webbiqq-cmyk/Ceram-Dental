// Quality Inspector dashboard — wired to the real workflow backend.
import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { jobTypeLabel, statusPill } from '../utils/workflow.js';
import { listOrders, qcDecision } from '../utils/ordersApi.js';
import { uploadZoneHtml, attachUploadZone } from '../components/caseUpload.js';
import { showOrderDetail } from '../components/orderDetail.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';
import { openNoteModal } from '../components/noteModal.js';

const CHECKLIST = ['Correct product, shade and material where applicable', 'Fitting and contact points checked where applicable', 'Finish checked; no cracks or defects', 'All components complete'];
const CHECKED = {}; // Draft checks; confirmed findings and packing are persisted in the review history.
const FINDINGS = {};

function detail(o) {
  const checks = CHECKED[o.id] || {};
  const allChecked = CHECKLIST.every(c => checks[c]) && checks.packed;
  return '<div class="card reveal" style="margin-top:14px;">' +
    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">' +
      '<div><h3 style="margin-bottom:2px;">' + o.order_number + ' · ' + esc(jobTypeLabel(o.job_type)) + '</h3><p>' + esc(o.patient_ref) + (o.shade ? ' · Shade ' + esc(o.shade) : '') + '</p></div>' +
      statusPill(o.status) +
    '</div><button class="btn btn-ghost" data-order-detail="' + o.id + '">Requirements, files &amp; notes</button>' +
    '<div class="drawer-sec" style="margin-top:20px;"><h4>QC checklist</h4><div class="qc-checklist">' +
      CHECKLIST.map(c => '<button type="button" class="qc-item' + (checks[c] ? ' checked' : '') + '" aria-pressed="' + !!checks[c] + '" data-qc-check="' + esc(c) + '" data-order="' + o.id + '">' +
        '<span class="qc-chk">' + (checks[c] ? '✓' : '') + '</span><span class="lbl">' + c + '</span></button>'
      ).join('') +
    '</div></div>' +
    '<div class="drawer-sec"><h4>QC photos</h4>' + uploadZoneHtml('qc-photo', 'Upload photos/scans where required', 'Drop a file here, or click to browse') + '</div>' +
    '<div class="drawer-sec"><label for="qcFindings">Record QC findings</label><textarea id="qcFindings" placeholder="Findings or exceptions; leave blank if all checks passed">' + esc(FINDINGS[o.id] || '') + '</textarea><h4>Packing &amp; readiness</h4>' +
      '<button type="button" class="qc-item' + (checks.packed ? ' checked' : '') + '" aria-pressed="' + !!checks.packed + '" data-qc-check="packed" data-order="' + o.id + '">' +
        '<span class="qc-chk">' + (checks.packed ? '✓' : '') + '</span><span class="lbl">Packed and ready to send</span></button>' +
    '</div>' +
    '<div class="drawer-actions" style="margin-top:20px; border-top:1px solid var(--line); padding-top:18px; background:none;">' +
      '<button class="btn btn-gold" data-qc-approve="' + o.id + '"' + (allChecked ? '' : ' disabled') + '>Confirm packing → send to reception</button>' +
      '<button class="btn btn-danger-ghost" data-qc-reject="' + o.id + '">Reject → back to technician</button>' +
      '<span data-checklist-hint' + (allChecked ? ' hidden' : '') + '>Complete the checklist and confirm packing to continue.</span>' +
    '</div>' +
  '</div>';
}

export async function renderQC() {
  let orders = [];
  try { orders = (await listOrders('qc')).orders; }
  catch (e) {
    return '<div class="page"><div class="u"><div class="page-head reveal"><span class="eyebrow-accent">Lab · Quality Inspector</span><h1 style="font-size:1.9rem;">QC review</h1></div>' +
      '<div class="empty-note">Couldn\'t reach the workflow backend (' + esc(e.message) + ').</div></div></div>';
  }
  const pending = orders.filter(o => o.status === 'qc_pending');
  const openId = UI.qcOpenId && pending.some(c => c.id === UI.qcOpenId) ? UI.qcOpenId : null;

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Lab · Quality Inspector</span><h1 style="font-size:1.9rem;">QC review</h1>' +
      '<p class="lede">Record QC findings, upload photos/scans where required, and confirm packing for reception.</p></div>' +
    '<div class="stat-row reveal"><div class="stat-card"><div class="n">' + pending.length + '</div><div class="l">Pending QC</div></div></div>' +
    (pending.length ? '<div class="case-list reveal">' + pending.map(o =>
      '<div class="case-card"><div class="cc-top"><div><div class="cc-id">' + o.order_number + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + '</div></div>' + statusPill(o.status) + '</div>' +
      '<div class="cc-title">' + esc(o.patient_ref) + (o.shade ? ' · Shade ' + esc(o.shade) : '') + '</div>' +
      '<div class="cc-foot"><span></span><button class="btn btn-ghost btn-sm" data-qc-open="' + o.id + '">' + (openId === o.id ? 'Close' : 'Review case') + '</button></div></div>'
    ).join('') + '</div>' : '<div class="empty-note">Nothing waiting on QC right now.</div>') +
    (openId ? detail(pending.find(c => c.id === openId)) : '') +
  '</div></div>';
}

export function attachQCHandlers() {
  document.getElementById('qcFindings')?.addEventListener('input', e => { FINDINGS[UI.qcOpenId] = e.target.value; });
  document.querySelectorAll('[data-order-detail]').forEach(b => b.addEventListener('click', () => showOrderDetail('qc', b.dataset.orderDetail)));
  document.querySelectorAll('[data-qc-open]').forEach(b => b.addEventListener('click', () => {
    UI.qcOpenId = UI.qcOpenId === b.dataset.qcOpen ? null : b.dataset.qcOpen;
    renderCurrent();
  }));
  document.querySelectorAll('[data-qc-check]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.order, key = b.dataset.qcCheck;
    CHECKED[id] = CHECKED[id] || {};
    CHECKED[id][key] = !CHECKED[id][key];
    b.classList.toggle('checked', CHECKED[id][key]); b.setAttribute('aria-pressed', String(CHECKED[id][key])); b.querySelector('.qc-chk').textContent=CHECKED[id][key]?'✓':'';
    const ready=CHECKLIST.every(c=>CHECKED[id][c]) && CHECKED[id].packed;
    document.querySelector('[data-qc-approve]').disabled=!ready;
    document.querySelector('[data-checklist-hint]').hidden=!!ready;
  }));
  document.querySelectorAll('[data-qc-approve]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.qcApprove;
    try {
      const res = await qcDecision(id, { decision: 'approve', packed: CHECKED[id]?.packed === true, note: CHECKLIST.join('; ') + '. Findings: ' + (document.getElementById('qcFindings')?.value.trim() || 'Checks passed; no defects found.') });
      UI.qcOpenId = null;
      toast(res.order.order_number + ' approved — sent to reception.');
      renderCurrent();
    } catch (e) { toast(e.message); }
  }));
  document.querySelectorAll('[data-qc-reject]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.qcReject;
    openNoteModal({ title: 'Reject case', label: 'What needs fixing?', confirmLabel: 'Reject & notify technician', danger: true }, async note => {
      try {
        const res = await qcDecision(id, { decision: 'reject', note });
        UI.qcOpenId = null;
        toast(res.order.order_number + ' sent back to the technician.');
        renderCurrent();
      } catch (e) { toast(e.message); }
    });
  }));
  const open = UI.qcOpenId;
  if (open) attachUploadZone(document, 'qc-photo', { role: 'qc', orderId: open, stageType: 'final', category: 'qc_photo' });
}
