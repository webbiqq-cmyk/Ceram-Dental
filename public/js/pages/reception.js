// Receptionist dashboard — wired to the real workflow backend
// (src/routes/orders.routes.js). Was a mock-data preview; now reads and
// writes real job_orders rows.
import { esc, fmtDateTime } from '../utils/format.js';
import { jobTypeLabel, statusPill } from '../utils/workflow.js';
import { listOrders, listStaff, receptionReview, confirmCompletion, markDelivered, markCompleted } from '../utils/ordersApi.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';
import { openNoteModal } from '../components/noteModal.js';

let designerOptions = [];

// Reception's own remaining step in each order's lifecycle, once it's
// past everyone else — closing out the loop the same dashboard opened it
// with (accept -> ... -> confirm -> delivered/completed).
function finalAction(o) {
  if (o.status === 'doctor_approved') return '<button class="btn btn-gold btn-sm" data-recv-confirm="' + o.id + '">Confirm completion</button>';
  if (o.status === 'ready_for_pickup') return '<button class="btn btn-primary btn-sm" data-recv-delivered="' + o.id + '">Mark picked up</button>';
  if (o.status === 'ready_for_delivery') return '<button class="btn btn-primary btn-sm" data-recv-delivered="' + o.id + '">Mark delivered</button>';
  if (o.status === 'delivered') return '<button class="btn btn-ghost btn-sm" data-recv-close="' + o.id + '">Close out order</button>';
  return '';
}

function orderCard(o) {
  const action = finalAction(o);
  return '<div class="case-card">' +
    '<div class="cc-top"><div><div class="cc-id">' + o.order_number + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + (o.job_type === 'veneers' ? ' · ' + (o.stage_type === 'demo' ? 'Demo' : 'Final') : '') + '</div></div>' + statusPill(o.status) + '</div>' +
    '<div class="cc-title">' + esc(o.patient_ref) + '</div>' +
    (o.rejection_note ? '<div class="cc-sub" style="color:var(--critical); margin-top:8px;">"' + esc(o.rejection_note) + '"</div>' : '') +
    '<div class="cc-foot"><span class="mono" style="font-size:11px; color:var(--ink-soft);">' + fmtDateTime(o.created_at) + '</span>' + action + '</div>' +
  '</div>';
}

export async function renderReception() {
  let orders = [], staff = [];
  try {
    [orders, staff] = await Promise.all([
      listOrders('receptionist').then(r => r.orders),
      listStaff('receptionist', 'designer').then(r => r.staff)
    ]);
  } catch (e) {
    return '<div class="page"><div class="u"><div class="page-head reveal"><span class="eyebrow-accent">Lab · Reception</span><h1 style="font-size:1.9rem;">Order intake</h1></div>' +
      '<div class="empty-note">Couldn\'t reach the workflow backend (' + esc(e.message) + '). Is DATABASE_URL set?</div></div></div>';
  }
  designerOptions = staff;

  const pending = orders.filter(o => o.status === 'pending_reception_review');
  const rejected = orders.filter(o => o.status === 'rejected_by_reception');
  const active = orders.filter(o => !['pending_reception_review', 'rejected_by_reception', 'completed'].includes(o.status)).slice(0, 6);

  const designerPicker = (id) => '<select class="dpick" data-order="' + id + '" style="font-size:12.5px; padding:6px 9px; border-radius:8px; border:1px solid var(--line); margin-right:6px;">' +
    '<option value="">Assign designer…</option>' + designerOptions.map(d => '<option value="' + d.id + '">' + esc(d.name) + '</option>').join('') + '</select>';

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><span class="eyebrow-accent">Lab · Reception</span><h1 style="font-size:1.9rem;">Order intake</h1>' +
      '<p class="lede">Check payment and case details on every new order before it goes to design.</p></div>' +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + pending.length + '</div><div class="l">Pending review</div></div>' +
      '<div class="stat-card tone-danger"><div class="n">' + rejected.length + '</div><div class="l">Rejected, awaiting doctor</div></div>' +
      '<div class="stat-card tone-gold"><div class="n">' + active.length + '</div><div class="l">Moving through the lab</div></div>' +
      '<div class="stat-card"><div class="n">' + orders.length + '</div><div class="l">Total in pipeline</div></div>' +
    '</div>' +

    '<div class="section-head reveal"><div><span class="eyebrow">Needs your review</span><h2>Pending orders</h2></div></div>' +
    (pending.length ? '<div class="case-list reveal">' + pending.map(o =>
      '<div class="case-card"><div class="cc-top"><div><div class="cc-id">' + o.order_number + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + '</div></div>' + statusPill(o.status) + '</div>' +
      '<div class="cc-title">' + esc(o.patient_ref) + (o.shade ? ' · Shade ' + esc(o.shade) : '') + '</div>' +
      (o.instructions ? '<div class="cc-sub">' + esc(o.instructions) + '</div>' : '') +
      '<div class="cc-foot" style="align-items:center; flex-wrap:wrap; gap:8px;">' +
        '<span style="font-size:11px; color:var(--ink-soft);">' + fmtDateTime(o.created_at) + '</span>' +
        '<div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">' + designerPicker(o.id) +
          '<button class="btn btn-primary btn-sm" data-recv-accept="' + o.id + '">Accept → Design</button>' +
          '<button class="btn btn-danger-ghost btn-sm" data-recv-reject="' + o.id + '">Reject</button>' +
        '</div></div></div>'
    ).join('') + '</div>' : '<div class="empty-note">Nothing waiting on reception right now.</div>') +

    '<div class="section-head reveal" style="margin-top:40px;"><div><span class="eyebrow">Sent back to the doctor</span><h2>Rejected orders</h2></div></div>' +
    (rejected.length ? '<div class="case-list reveal">' + rejected.map(orderCard).join('') + '</div>' : '<div class="empty-note">No rejected orders.</div>') +

    '<div class="section-head reveal" style="margin-top:40px;"><div><span class="eyebrow">Moving forward</span><h2>Active in the lab</h2></div></div>' +
    (active.length ? '<div class="case-grid reveal">' + active.map(orderCard).join('') + '</div>' : '<div class="empty-note">Nothing else active right now.</div>') +

  '</div></div>';
}

export function attachReceptionHandlers() {
  document.querySelectorAll('[data-recv-accept]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.recvAccept;
    const sel = document.querySelector('select.dpick[data-order="' + id + '"]');
    const designerId = sel ? sel.value : '';
    if (!designerId) { toast('Choose a designer first.'); return; }
    try {
      const res = await receptionReview(id, { decision: 'accept', designerId });
      toast(res.order.order_number + ' accepted — sent to design.');
      renderCurrent();
    } catch (e) { toast(e.message); }
  }));
  document.querySelectorAll('[data-recv-reject]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.recvReject;
    openNoteModal({ title: 'Reject order', label: 'Rejection note for the doctor', confirmLabel: 'Reject & notify doctor', danger: true }, async note => {
      try {
        const res = await receptionReview(id, { decision: 'reject', note });
        toast(res.order.order_number + ' rejected — note sent to the doctor.');
        renderCurrent();
      } catch (e) { toast(e.message); }
    });
  }));
  document.querySelectorAll('[data-recv-confirm]').forEach(b => b.addEventListener('click', async () => {
    try { const res = await confirmCompletion(b.dataset.recvConfirm); toast(res.order.order_number + ' — ' + res.order.status.replace(/_/g, ' ') + '.'); renderCurrent(); }
    catch (e) { toast(e.message); }
  }));
  document.querySelectorAll('[data-recv-delivered]').forEach(b => b.addEventListener('click', async () => {
    try { const res = await markDelivered(b.dataset.recvDelivered); toast(res.order.order_number + ' marked delivered.'); renderCurrent(); }
    catch (e) { toast(e.message); }
  }));
  document.querySelectorAll('[data-recv-close]').forEach(b => b.addEventListener('click', async () => {
    try { const res = await markCompleted(b.dataset.recvClose); toast(res.order.order_number + ' completed.'); renderCurrent(); }
    catch (e) { toast(e.message); }
  }));
}
