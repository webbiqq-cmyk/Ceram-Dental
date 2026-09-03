// Notification bell — shared across all three signed-in portals. Polled on
// an interval from app.js (not just on navigation) so a badge appears even
// if someone sits on one page for a while. In-app only for now (no OS
// push) — see README for why, and what real push would need.
import { DATA, api, loadNotifications } from '../state.js';
import { esc } from '../utils/format.js';
import { toast } from '../toast.js';

function timeAgo(d) {
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

function renderDropdown() {
  const list = DATA.notifications.slice(0, 20);
  const body = list.length
    ? list.map(n =>
        '<div class="notif-item' + (n.read ? '' : ' unread') + '" data-notif-id="' + n.id + '">' +
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
  const signedIntoAny = DATA.auth.admin || DATA.auth.dentist || DATA.auth.lab;
  wrap.hidden = !signedIntoAny;
  if (!signedIntoAny) return;
  badge.textContent = DATA.unreadNotifications;
  badge.hidden = DATA.unreadNotifications === 0;
  dropdown.innerHTML = renderDropdown();
  const markAllBtn = document.getElementById('notifMarkAll');
  if (markAllBtn) markAllBtn.addEventListener('click', async () => {
    try { await api('/api/notifications/read-all', { method: 'POST' }); await loadNotifications(); updateNotifUI(); }
    catch (e) { toast(e.message); }
  });
  dropdown.querySelectorAll('[data-notif-id]').forEach(el => el.addEventListener('click', async () => {
    try { await api('/api/notifications/' + el.dataset.notifId + '/read', { method: 'POST' }); await loadNotifications(); updateNotifUI(); }
    catch (e) { /* non-critical */ }
  }));
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
