import { listOrders } from '../../utils/ordersApi.js';
import { statusPill, jobTypeLabel } from '../../utils/workflow.js';
import { showOrderDetail } from '../../components/orderDetail.js';
import { DATA } from '../../state.js';
import { esc, money } from '../../utils/format.js';

function shopOrders() {
  if (!DATA.orders.length) return '<div class="empty-note">No shop orders yet — place one from the Shop page.</div>';
  const rows = DATA.orders.map(o => {
    const items = o.items.map(i => i.qty + '× ' + i.name).join(', ');
    return '<div class="list-row"><div><div class="t">' + o.id + ' — ' + esc((o.customer && o.customer.name) || 'Guest') + '</div><div class="s">' + items + '</div></div><div class="t">' + money(o.total) + '</div></div>';
  }).join('');
  return '<div class="card reveal"><div class="list-plain">' + rows + '</div></div>';
}

export async function adminOrders() {
  const {orders} = await listOrders('admin');
  return '<h3>Lab job orders</h3><div class="case-list">' + orders.map(o => '<div class="case-card"><h4>' + esc(o.order_number) + ' · ' + esc(jobTypeLabel(o.job_type)) + '</h4>' + statusPill(o.status) + '<p>' + esc(o.patient_ref) + '</p><button class="btn btn-ghost" data-admin-job="' + o.id + '">History, files &amp; chat</button></div>').join('') + '</div><h3>Shop orders</h3>' + shopOrders();
}
export function attachOrderHandlers() {
  document.querySelectorAll('[data-admin-job]').forEach(b => b.addEventListener('click', () => showOrderDetail('admin', b.dataset.adminJob)));
}
