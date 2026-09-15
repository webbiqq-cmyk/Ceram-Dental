// Notification bell — shared across all three signed-in portals. Polled on
// an interval from app.js (not just on navigation) so a badge appears even
// if someone sits on one page for a while. In-app only for now (no OS
// push) — see README for why, and what real push would need.
import { DATA, UI, api, loadNotifications, currentPortalRole } from '../state.js';
import { esc } from '../utils/format.js';
import { toast } from '../toast.js';

// The bell is not a permanent nav fixture. Like the cart button, it only
// earns a place in the topbar where notifications are actually actionable:
// inside the staff portals, or once someone is shopping / mid-order. A
// visitor reading the clinic pages gets a plain, uncluttered nav.
const PUBLIC_ROUTES = { '': 1, about: 1, services: 1, shop: 1, contact: 1, careers: 1, 'new-case': 1 };
function notifRelevant() {
  const route = (location.hash || '#/').slice(2).split(/[/?]/)[0];
  const inPortal = !PUBLIC_ROUTES[route];
  const shopping = route === 'shop' || UI.cart.length > 0;
  return inPortal || shopping;
}

function timeAgo(d) {
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

// Three levels, and urgent is rare on purpose. If everything is urgent
// the bell stops being read, and then the one notification that mattered
// is the one nobody saw.
const URGENT = new Set(['production-blocked', 'qc-repeat-failure']);
const ACTION = new Set(['order-new', 'case-returned', 'design-ready', 'design-changes', 'qc-rework', 'qc-pending', 'design-assigned', 'production-assigned', 'case-message']);
// Case notifications carry the job order's id; opening one should land on
// that case, not on a list the person then has to search.
const CASE_TYPES = new Set([...URGENT, ...ACTION, 'qc-passed', 'case-ready', 'case-completed', 'case-accepted', 'design-approved', 'production-resumed']);

function level(type) { return URGENT.has(type) ? 'urgent' : ACTION.has(type) ? 'action' : 'info'; }

function renderDropdown() {
  const list = DATA.notifications.slice(0, 20);
  const body = list.length
    ? list.map(n =>
        '<div class="notif-item notif-' + level(n.type) + (n.read ? '' : ' unread') + '" data-notif-id="' + n.id + '"' +
          (CASE_TYPES.has(n.type) && n.relatedId ? ' data-notif-case="' + esc(n.relatedId) + '" role="button" tabindex="0"' : '') + '>' +
          (level(n.type) !== 'info' ? '<span class="notif-level">' + (level(n.type) === 'urgent' ? 'Urgent' : 'Action required') + '</span>' : '') +
          '<div class="notif-title">' + esc(n.title) + '</div>' +
          (n.body ? '<div class="notif-body">' + esc(n.body) + '</div>' : '') +
          '<div class="notif-time">' + timeAgo(n.createdAt) + '</div>' +
        '</div>'
      ).join('')
    : '<div class="empty-note" style="padding:18px;">No notifications yet.</div>';
  return '<div class="notif-head"><span>Notifications</span>' +
    (DATA.unreadNotifications ? '<button class="btn btn-ghost btn-sm" id="notifMarkAll">Mark all read</button>' : '') +
    '</div>' + body;
}


export function updateNotifUI() {
  const wrap = document.getElementById('notifWrap');
  const badge = document.getElementById('notifBadge');
  const dropdown = document.getElementById('notifDropdown');
  if (!wrap || !badge || !dropdown) return;
  const role = currentPortalRole();
  // Same rule as the fetch in state.js: the bell belongs to the role the
  // server says we are, not to "signed into something, somewhere".
  const show = !!role && !!DATA.auth[role] && notifRelevant();
  wrap.hidden = !show;
  if (!show) { dropdown.classList.remove('open'); return; }
  badge.textContent = DATA.unreadNotifications;
  badge.hidden = DATA.unreadNotifications === 0;
  dropdown.innerHTML = renderDropdown();
  const markAllBtn = document.getElementById('notifMarkAll');
  if (markAllBtn) markAllBtn.addEventListener('click', async () => {
    try { await api('/api/notifications/read-all?asRole=' + encodeURIComponent(currentPortalRole()), { method: 'POST' }); await loadNotifications(); updateNotifUI(); }
    catch (e) { toast(e.message); }
  });
  dropdown.querySelectorAll('[data-notif-id]').forEach(el => {
    const open = async () => {
      try { await api('/api/notifications/' + el.dataset.notifId + '/read?asRole=' + encodeURIComponent(currentPortalRole()), { method: 'POST' }); await loadNotifications(); updateNotifUI(); }
      catch (e) { /* non-critical — reading the case matters more than the badge */ }
      // A notification that can't take you to the thing it is about is
      // just a nag. Loaded on demand so the bell costs nothing on a page
      // that never opens a case.
      if (el.dataset.notifCase) {
        dropdown.classList.remove('open');
        const { showCaseCenter } = await import('./caseCenter.js');
        showCaseCenter(currentPortalRole() || 'lab', el.dataset.notifCase);
      }
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

export function initNotifBell() {
  const btn = document.getElementById('notifBtn');
  const dropdown = document.getElementById('notifDropdown');
  if (!btn) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'));
}
