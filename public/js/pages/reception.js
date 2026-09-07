// Receptionist dashboard — design preview. Reads from utils/mockWorkflow.js,
// not a live backend (see src/db/migrations/ for the real schema this will
// wire to once Phase 2's orders API exists). UI-only: accept/reject here
// update the in-memory mock list for this browser tab, nothing more.
import { esc, fmtDateTime } from '../utils/format.js';
import { MOCK_ORDERS, jobTypeLabel, statusPill } from '../utils/mockWorkflow.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';
import { openNoteModal } from '../components/noteModal.js';

function previewNote() {
  return '<div class="empty-note" style="text-align:left; background:var(--gold-soft); border:1px solid color-mix(in srgb, var(--gold) 30%, var(--line)); border-radius:12px; padding:14px 16px; margin-bottom:24px;">' +
    '<b style="color:var(--gold);">Design preview</b> — sample orders shown here so the receptionist workflow can be reviewed visually. Connects to real orders once the lab workflow backend (Phase 2) is wired in.</div>';
}

function orderCard(o, actions) {
  return '<div class="case-card">' +
    '<div class="cc-top"><div><div class="cc-id">' + o.id + '</div><div class="cc-type">' + esc(jobTypeLabel(o.jobType)) + (o.jobType === 'veneers' ? ' · ' + (o.stageType === 'demo' ? 'Demo' : 'Final') : '') + '</div></div>' + statusPill(o.status) + '</div>' +
    '<div class="cc-title">' + esc(o.clinic) + '</div><div class="cc-sub">' + esc(o.patient) + ' · Shade ' + esc(o.shade) + '</div>' +
    (o.rejectionNote ? '<div class="cc-sub" style="color:var(--critical); margin-top:8px;">"' + esc(o.rejectionNote) + '"</div>' : '') +
    '<div class="cc-foot"><span class="mono" style="font-size:11px; color:var(--ink-soft);">' + fmtDateTime(o.submittedAt) + '</span>' + (actions || '') + '</div>' +
  '</div>';
}

export function renderReception() {
  const pending = MOCK_ORDERS.filter(o => o.status === 'pending_reception_review');
  const rejected = MOCK_ORDERS.filter(o => o.status === 'rejected_by_reception');
  const accepted = MOCK_ORDERS.filter(o => !['pending_reception_review', 'rejected_by_reception'].includes(o.status)).slice(0, 4);

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Lab · Reception</span><h1 style="font-size:1.9rem;">Order intake</h1>' +
      '<p class="lede">Check payment and case details on every new order before it goes to design.</p></div>' +
    previewNote() +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + pending.length + '</div><div class="l">Pending review</div></div>' +
      '<div class="stat-card tone-danger"><div class="n">' + rejected.length + '</div><div class="l">Rejected, awaiting doctor</div></div>' +
      '<div class="stat-card tone-gold"><div class="n">' + accepted.length + '</div><div class="l">Accepted today</div></div>' +
      '<div class="stat-card"><div class="n">' + MOCK_ORDERS.length + '</div><div class="l">Total in pipeline</div></div>' +
    '</div>' +

    '<div class="section-head reveal"><div><span class="eyebrow">Needs your review</span><h2>Pending orders</h2></div></div>' +
    (pending.length ? '<div class="case-list reveal">' + pending.map(o =>
      '<div class="case-card"><div class="cc-top"><div><div class="cc-id">' + o.id + '</div><div class="cc-type">' + esc(jobTypeLabel(o.jobType)) + '</div></div>' + statusPill(o.status) + '</div>' +
      '<div class="cc-title">' + esc(o.clinic) + '</div><div class="cc-sub">' + esc(o.patient) + ' · Shade ' + esc(o.shade) + '</div>' +
      '<div class="cc-foot" style="align-items:center;">' +
        '<span style="display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:var(--ready);">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>Payment confirmed</span>' +
        '<div style="display:flex; gap:8px;">' +
          '<button class="btn btn-primary btn-sm" data-recv-accept="' + o.id + '">Accept → Design</button>' +
          '<button class="btn btn-danger-ghost btn-sm" data-recv-reject="' + o.id + '">Reject</button>' +
        '</div></div></div>'
    ).join('') + '</div>' : '<div class="empty-note">Nothing waiting on reception right now.</div>') +

    '<div class="section-head reveal" style="margin-top:40px;"><div><span class="eyebrow">Sent back to the doctor</span><h2>Rejected orders</h2></div></div>' +
    (rejected.length ? '<div class="case-list reveal">' + rejected.map(o => orderCard(o)).join('') + '</div>' : '<div class="empty-note">No rejected orders.</div>') +

    '<div class="section-head reveal" style="margin-top:40px;"><div><span class="eyebrow">Moving forward</span><h2>Recently accepted</h2></div></div>' +
    '<div class="case-grid reveal">' + accepted.map(o => orderCard(o)).join('') + '</div>' +

  '</div></div>';
}

export function attachReceptionHandlers() {
  document.querySelectorAll('[data-recv-accept]').forEach(b => b.addEventListener('click', () => {
    const o = MOCK_ORDERS.find(x => x.id === b.dataset.recvAccept);
    if (o) { o.status = 'assigned_to_designer'; toast(o.id + ' accepted — sent to design.'); renderCurrent(); }
  }));
  document.querySelectorAll('[data-recv-reject]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.recvReject;
    openNoteModal({ title: 'Reject ' + id, label: 'Rejection note for the doctor', confirmLabel: 'Reject & notify doctor', danger: true }, note => {
      const o = MOCK_ORDERS.find(x => x.id === id);
      if (o) { o.status = 'rejected_by_reception'; o.rejectionNote = note; toast(o.id + ' rejected — note sent to the doctor.'); renderCurrent(); }
    });
  }));
}
