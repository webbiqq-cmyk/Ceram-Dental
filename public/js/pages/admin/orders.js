import { listOrders } from '../../utils/ordersApi.js';
import { showCaseCenter } from '../../components/caseCenter.js';
import { caseQueue, attachCaseQueue, attachQueueSearch } from '../../components/caseQueue.js';
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
  const { orders } = await listOrders('admin');
  // Administration sees the whole board, so it gets the dense table
  // rather than cards — this is the one place a hundred rows is normal.
  return '<h3>Lab job orders</h3>' +
    '<div class="workspace-toolbar"><input type="search" id="adminOrderSearch" aria-label="Search job orders" placeholder="Search case number, patient, clinic, treatment or owner…"></div>' +
    caseQueue(orders, { density: 'table', empty: { title: 'No job orders yet', text: 'Cases submitted by clinics appear here.', iconName: 'inbox' } }) +
    '<p class="empty-note" id="adminOrderNoMatch" hidden>No job orders match your search.</p>' +
    '<h3>Shop orders</h3>' + shopOrders();
}

export function attachOrderHandlers() {
  attachCaseQueue('admin', id => showCaseCenter('admin', id));
  attachQueueSearch('adminOrderSearch', 'adminOrderNoMatch');
}
