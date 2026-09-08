import { UI } from '../state.js';
// Receptionist dashboard — wired to the real workflow backend
// (src/routes/orders.routes.js). Was a mock-data preview; now reads and
// writes real job_orders rows.
import { esc, fmtDateTime } from '../utils/format.js';
import { jobTypeLabel, statusPill } from '../utils/workflow.js';
import { listOrders, listStaff, receptionReview, confirmCompletion, markDelivered, markCompleted } from '../utils/ordersApi.js';
import { showOrderDetail } from '../components/orderDetail.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';
import { openNoteModal } from '../components/noteModal.js';

let designerOptions = [];
let technicianOptions = [];

// Reception's own remaining step in each order's lifecycle, once it's
// past everyone else — closing out the loop the same dashboard opened it
// with (accept -> ... -> confirm -> delivered/completed).
function finalAction(o) {
  if (o.status === 'qc_approved') return '<button class="btn btn-gold btn-sm" data-recv-confirm="' + o.id + '">Mark ready for pickup/delivery</button>';
  if (o.status === 'ready_for_pickup') return '<button class="btn btn-primary btn-sm" data-recv-delivered="' + o.id + '">Mark picked up</button>';
  if (o.status === 'ready_for_delivery') return '<button class="btn btn-primary btn-sm" data-recv-delivered="' + o.id + '">Mark delivered</button>';
  if (o.status === 'delivered') return '<button class="btn btn-ghost btn-sm" data-recv-close="' + o.id + '">Close out order</button>';
  return '';
}

function orderCard(o) {
  const action = finalAction(o);
  return '<div class="case-card">' +
    '<div class="cc-top"><div><div class="cc-id">' + o.order_number + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + (o.job_type === 'veneers' ? ' · ' + (o.stage_type === 'demo' ? 'Demo' : 'Final') : '') + '</div></div>' + statusPill(o.status) + '</div>' +
    '<button class="btn btn-ghost btn-sm" data-order-detail="' + o.id + '">Files, notes &amp; chat</button><div class="cc-title">' + esc(o.patient_ref) + '</div>' +
    (o.rejection_note ? '<div class="cc-sub" style="color:var(--critical); margin-top:8px;">"' + esc(o.rejection_note) + '"</div>' : '') +
    '<div class="cc-foot"><span class="mono" style="font-size:11px; color:var(--ink-soft);">' + fmtDateTime(o.created_at) + '</span>' + action + '</div>' +
  '</div>';
}

export async function renderReception() {
  let orders = [], staff = [], technicians = [];
  try {
    [orders, staff, technicians] = await Promise.all([
      listOrders('receptionist').then(r => r.orders),
      listStaff('receptionist', 'designer').then(r => r.staff),
      listStaff('receptionist', 'technician').then(r => r.staff)
    ]);
  } catch (e) {
    return '<div class="page"><div class="u"><div class="page-head reveal"><div><span class="eyebrow-accent">Lab · Reception</span><h1>Order intake</h1></div></div>' +
      '<div class="empty-note">Couldn\'t reach the workflow backend (' + esc(e.message) + ').</div></div></div>';
  }
  designerOptions = staff; technicianOptions = technicians;

  const pending = orders.filter(o => o.status === 'pending_reception_review');
  const rejected = orders.filter(o => o.status === 'rejected_by_reception');
  const delivery = orders.filter(o => ['qc_approved','ready_for_pickup','ready_for_delivery','delivered'].includes(o.status));
  const completed = orders.filter(o => o.status === 'completed');
  const active = orders.filter(o => !['pending_reception_review','rejected_by_reception','completed','qc_approved','ready_for_pickup','ready_for_delivery','delivered'].includes(o.status));

  const designerPicker = (id) => '<select aria-label="Assign designer" class="dpick" data-order="' + id + '" style="font-size:12.5px; padding:6px 9px; border-radius:8px; border:1px solid var(--line); margin-right:6px;">' +
    '<option value="">Assign designer…</option>' + designerOptions.map(d => '<option value="' + d.id + '">' + esc(d.name) + '</option>').join('') + '</select>';

  return '<div class="page"><div class="u">' +
    '<div class="page-head reveal"><div><span class="eyebrow-accent">Lab · Reception</span><h1>Order intake</h1>' +
      '<p class="lede">Check payment and case details on every new order before it goes to design.</p></div></div>' +
    '<div class="stat-row reveal">' +
      '<div class="stat-card"><div class="n">' + pending.length + '</div><div class="l">Pending review</div></div>' +
      '<div class="stat-card tone-danger"><div class="n">' + rejected.length + '</div><div class="l">Rejected, awaiting doctor</div></div>' +
      '<div class="stat-card tone-gold"><div class="n">' + active.length + '</div><div class="l">Moving through the lab</div></div>' +
      '<div class="stat-card"><div class="n">' + orders.length + '</div><div class="l">Total in pipeline</div></div>' +
    '</div>' +

    '<div class="workspace-tabs" aria-label="Reception queues">' + [['incoming','Incoming',pending.length],['delivery','Pickup / delivery',delivery.length],['active','In the lab',active.length],['rejected','Rejected',rejected.length],['completed','Completed',completed.length]].map(([key,label,count])=>'<button data-reception-tab="' + key + '" aria-pressed="' + ((UI.receptionTab || 'incoming')===key) + '">' + label + ' · ' + count + '</button>').join('') + '</div><section data-reception-group="incoming">' +
    '<div class="section-head reveal"><div><span class="eyebrow">Needs your review</span><h2>Pending orders</h2></div></div>' +
    (pending.length ? '<div class="case-list reveal">' + pending.map(o =>
      '<div class="case-card"><div class="cc-top"><div><div class="cc-id">' + o.order_number + '</div><div class="cc-type">' + esc(jobTypeLabel(o.job_type)) + '</div></div>' + statusPill(o.status) + '</div>' +
      '<button class="btn btn-ghost btn-sm" data-order-detail="' + o.id + '">Files, notes &amp; chat</button><div class="cc-title">' + esc(o.patient_ref) + (o.shade ? ' · Shade ' + esc(o.shade) : '') + '</div>' +
      (o.instructions ? '<div class="cc-sub">' + esc(o.instructions) + '</div>' : '') +
      '<label><input type="checkbox" data-payment="' + o.id + '"> Payment status checked</label><label><input type="checkbox" data-details="' + o.id + '"> Required details complete</label>' +
      '<div class="cc-foot" style="align-items:center; flex-wrap:wrap; gap:8px;">' +
        '<span style="font-size:11px; color:var(--ink-soft);">' + fmtDateTime(o.created_at) + '</span>' +
        '<div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">' + designerPicker(o.id) + (o.job_type !== 'veneers' ? '<select aria-label="Assign technician when no design is needed" data-direct-tech="' + o.id + '"><option value="">Or skip design → technician…</option>' + technicianOptions.map(t => '<option value="' + t.id + '">' + esc(t.name) + '</option>').join('') + '</select>' : '') +
          '<button class="btn btn-primary btn-sm" data-recv-accept="' + o.id + '">Accept &amp; assign</button>' +
          '<button class="btn btn-danger-ghost btn-sm" data-recv-reject="' + o.id + '">Reject</button>' +
        '</div></div></div>'
    ).join('') + '</div>' : '<div class="empty-note">Nothing waiting on reception right now.</div>') +

    '</section><section data-reception-group="rejected"><div class="section-head reveal" style="margin-top:40px;"><div><span class="eyebrow">Sent back to the doctor</span><h2>Rejected orders</h2></div></div>' +
    (rejected.length ? '<div class="case-list reveal">' + rejected.map(orderCard).join('') + '</div>' : '<div class="empty-note">No rejected orders.</div>') +

    '</section><section data-reception-group="active"><div class="section-head reveal" style="margin-top:40px;"><div><span class="eyebrow">Moving forward</span><h2>Active in the lab</h2></div></div>' +
    (active.length ? '<div class="case-grid reveal">' + active.map(orderCard).join('') + '</div>' : '<div class="empty-note">Nothing else active right now.</div>') +

    '</section><section data-reception-group="delivery"><div class="section-head"><h2>Pickup & delivery</h2></div>' + (delivery.length ? '<div class="case-list">' + delivery.map(orderCard).join('') + '</div>' : '<p class="empty-note">No cases ready for collection yet.</p>') + '</section><section data-reception-group="completed"><div class="section-head"><h2>Completed cases</h2></div>' + (completed.length ? '<div class="case-list">' + completed.map(orderCard).join('') + '</div>' : '<p class="empty-note">Completed cases will appear here.</p>') + '</section>' +
  '</div></div>';
}

export function attachReceptionHandlers() {
  const showQueue=key=>{
    UI.receptionTab=key;
    document.querySelectorAll('[data-reception-group]').forEach(el=>el.hidden=el.dataset.receptionGroup!==key);
    document.querySelectorAll('[data-reception-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.receptionTab===key)));
  };
  showQueue(UI.receptionTab || 'incoming');
  document.querySelectorAll('[data-reception-tab]').forEach(b=>b.addEventListener('click',()=>showQueue(b.dataset.receptionTab)));
  document.querySelectorAll('.dpick,[data-direct-tech]').forEach(select=>select.addEventListener('change',()=>{
    const card=select.closest('.case-card');
    if(select.value) card.querySelectorAll('select').forEach(other=>{if(other!==select)other.value='';});
  }));
  document.querySelectorAll('[data-order-detail]').forEach(b => b.addEventListener('click', () => showOrderDetail('receptionist', b.dataset.orderDetail)));
  document.querySelectorAll('[data-recv-accept]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.recvAccept;
    const sel = document.querySelector('select.dpick[data-order="' + id + '"]');
    const designerId = sel ? sel.value : '';
    const technicianId = document.querySelector('[data-direct-tech="' + id + '"]')?.value;
    if (!designerId && !technicianId) { toast('Choose a designer or technician to continue.'); return; }
    try {
      const res = await receptionReview(id, { decision: 'accept', designerId, technicianId, paymentChecked: document.querySelector('[data-payment="' + id + '"]').checked, detailsChecked: document.querySelector('[data-details="' + id + '"]').checked });
      toast(res.order.order_number + ' accepted and assigned.');
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
