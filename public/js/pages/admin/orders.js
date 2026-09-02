import { DATA } from '../../state.js';
import { esc, money } from '../../utils/format.js';

export function adminOrders() {
  if (!DATA.orders.length) return '<div class="empty-note">No shop orders yet — place one from the Shop page.</div>';
  const rows = DATA.orders.map(o => {
    const items = o.items.map(i => i.qty + '× ' + i.name).join(', ');
    return '<div class="list-row"><div><div class="t">' + o.id + ' — ' + esc((o.customer && o.customer.name) || 'Guest') + '</div><div class="s">' + items + '</div></div><div class="t">' + money(o.total) + '</div></div>';
  }).join('');
  return '<div class="card reveal"><div class="list-plain">' + rows + '</div></div>';
}
