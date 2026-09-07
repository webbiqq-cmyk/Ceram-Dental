// Quality Inspector dashboard — design preview (see reception.js's header
// comment). QC is the one role that gates BOTH directions: reject back to
// the technician, or approve and send to the doctor for their own
// approval — so this page is built around one clear checklist + a single
// pair of primary/danger actions, not a busy multi-tab screen.
import { UI } from '../state.js';
import { esc } from '../utils/format.js';
import { MOCK_ORDERS, jobTypeLabel, statusPill } from '../utils/mockWorkflow.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';
import { openNoteModal } from '../components/noteModal.js';

const CHECKLIST = ['Matches the shade on file', 'Margins are clean and closed', 'Occlusion / bite checked', 'Surface finish free of defects', 'Case photos taken'];
const CHECKED = {};

function queue() { return MOCK_ORDERS.filter(o => o.status === 'qc_pending'); }

function detail(o) {
  const checks = CHECKED[o.id] || {};
  const allChecked = CHECKLIST.every(c => checks[c]);
  return '<div class="card reveal" style="margin-top:14px;">' +
    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">' +
      '<div><h3 style="margin-bottom:2px;">' + o.id + ' · ' + esc(jobTypeLabel(o.jobType)) + '</h3><p>' + esc(o.clinic) + ' · ' + esc(o.patient) + ' · Shade ' + esc(o.shade) + '</p></div>' +
      statusPill(o.status) +
    '</div>' +
    '<div class="drawer-sec" style="margin-top:20px;"><h4>QC checklist</h4><div class="qc-checklist">' +
      CHECKLIST.map(c => '<div class="qc-item' + (checks[c] ? ' checked' : '') + '" data-qc-check="' + esc(c) + '" data-order="' + o.id + '">' +
        '<span class="qc-chk">' + (checks[c] ? '✓' : '') + '</span><span class="lbl">' + c + '</span></div>'
      ).join('') +
    '</div></div>' +
    '<div class="drawer-sec"><h4>QC photos</h4>' +
      '<div class="upload-zone"><div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 16l4.5-6 3 4 3-3L20 16M4 4h16v16H4Z"/></svg></div>' +
        '<div class="t">Attach final QC photos</div><div class="d">Drop files here, or click to browse (preview only)</div></div>' +
    '</div>' +
    '<div class="drawer-sec"><h4>Packing &amp; readiness</h4>' +
      '<div class="qc-item' + (checks.packed ? ' checked' : '') + '" data-qc-check="packed" data-order="' + o.id + '">' +
        '<span class="qc-chk">' + (checks.packed ? '✓' : '') + '</span><span class="lbl">Packed and ready to send</span></div>' +
    '</div>' +
    '<div class="drawer-actions" style="margin-top:20px; border-top:1px solid var(--line); padding-top:18px; background:none;">' +
      '<button class="btn btn-gold" data-qc-approve="' + o.id + '"' + (allChecked ? '' : ' disabled') + '>Approve → send to doctor</button>' +
      '<button class="btn btn-danger-ghost" data-qc-reject="' + o.id + '">Reject → back to technician</button>' +
      (allChecked ? '' : '<span style="font-size:12px; color:var(--ink-soft); align-self:center;">Complete the checklist to approve</span>') +
    '</div>' +
  '</div>';
}

export function renderQC() {
  const cases = queue();
  const openId = UI.qcOpenId && cases.some(c => c.id === UI.qcOpenId) ? UI.qcOpenId : null;

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Lab · Quality Inspector</span><h1 style="font-size:1.9rem;">QC review</h1>' +
      '<p class="lede">Every case gets the same checklist before it ever reaches a doctor for approval.</p></div>' +
    '<div class="empty-note" style="text-align:left; background:var(--gold-soft); border:1px solid color-mix(in srgb, var(--gold) 30%, var(--line)); border-radius:12px; padding:14px 16px; margin-bottom:24px;"><b style="color:var(--gold);">Design preview</b> — sample data; wires to the real workflow backend once Phase 2 lands.</div>' +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + cases.length + '</div><div class="l">Pending QC</div></div>' +
    '</div>' +
    (cases.length ? '<div class="case-list reveal">' + cases.map(o =>
      '<div class="case-card"><div class="cc-top"><div><div class="cc-id">' + o.id + '</div><div class="cc-type">' + esc(jobTypeLabel(o.jobType)) + '</div></div>' + statusPill(o.status) + '</div>' +
      '<div class="cc-title">' + esc(o.clinic) + '</div><div class="cc-sub">' + esc(o.patient) + ' · Shade ' + esc(o.shade) + '</div>' +
      '<div class="cc-foot"><span></span><button class="btn btn-ghost btn-sm" data-qc-open="' + o.id + '">' + (openId === o.id ? 'Close' : 'Review case') + '</button></div></div>'
    ).join('') + '</div>' : '<div class="empty-note">Nothing waiting on QC right now.</div>') +
    (openId ? detail(cases.find(c => c.id === openId)) : '') +
  '</div></div>';
}

export function attachQCHandlers() {
  document.querySelectorAll('[data-qc-open]').forEach(b => b.addEventListener('click', () => {
    UI.qcOpenId = UI.qcOpenId === b.dataset.qcOpen ? null : b.dataset.qcOpen;
    renderCurrent();
  }));
  document.querySelectorAll('[data-qc-check]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.order, key = b.dataset.qcCheck;
    CHECKED[id] = CHECKED[id] || {};
    CHECKED[id][key] = !CHECKED[id][key];
    renderCurrent();
  }));
  document.querySelectorAll('[data-qc-approve]').forEach(b => b.addEventListener('click', () => {
    const o = MOCK_ORDERS.find(x => x.id === b.dataset.qcApprove);
    if (o) { o.status = 'waiting_doctor_approval'; UI.qcOpenId = null; toast(o.id + ' approved — sent to the doctor.'); renderCurrent(); }
  }));
  document.querySelectorAll('[data-qc-reject]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.qcReject;
    openNoteModal({ title: 'Reject ' + id, label: 'What needs fixing?', confirmLabel: 'Reject & notify technician', danger: true }, note => {
      const o = MOCK_ORDERS.find(x => x.id === id);
      if (o) { o.status = 'qc_rejected'; o.rejectionNote = note; UI.qcOpenId = null; toast(o.id + ' sent back to the technician.'); renderCurrent(); }
    });
  }));
}
