// Notification bell — shared across all three signed-in portals. Polled on
// an interval from app.js (not just on navigation) so a badge appears even
// if someone sits on one page for a while. In-app only for now (no OS
// push) — see README for why, and what real push would need.
import { DATA, UI, api, loadNotifications, currentPortalRole } from '../state.js';
import { esc } from '../utils/format.js';
import { icon } from './icons.js';
import { toast } from '../toast.js';
import { effectiveLang } from '../i18n.js';

// The bell can appear on the public site itself (shop route, or anywhere
// once there's something in the cart — see notifRelevant() below), so it
// needs to follow the visitor's language like the rest of the public
// chrome. effectiveLang() already forces 'en' inside a workspace route, so
// this stays English-only there without any extra logic here.
const S = {
  en: {
    notifications: 'Notifications', markAll: 'Mark all read',
    empty: 'Nothing yet. Updates on your cases will appear here.',
    needsAttention: 'Needs your attention', today: 'Today', earlier: 'Earlier',
    justNow: 'just now', mAgo: m => m + 'm ago', hAgo: h => h + 'h ago', dAgo: d => d + 'd ago'
  },
  ar: {
    notifications: 'الإشعارات', markAll: 'تعليم الكل كمقروء',
    empty: 'لا شيء بعد. ستظهر هنا آخر التحديثات على حالاتك.',
    needsAttention: 'بحاجة إلى اهتمامك', today: 'اليوم', earlier: 'سابقًا',
    justNow: 'الآن', mAgo: m => 'قبل ' + m + ' د', hAgo: h => 'قبل ' + h + ' س', dAgo: d => 'قبل ' + d + ' ي'
  }
};

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
  const t = S[effectiveLang()];
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return t.justNow;
  const m = Math.round(s / 60); if (m < 60) return t.mAgo(m);
  const h = Math.round(m / 60); if (h < 24) return t.hAgo(h);
  return t.dAgo(Math.round(h / 24));
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

// Icons carry the kind of event, so a glance down the panel separates
// "someone is waiting on you" from "something finished".
const TYPE_ICON = {
  'order-new': 'inbox', 'case-returned': 'alert', 'design-ready': 'sliders', 'design-changes': 'alert',
  'design-assigned': 'sliders', 'design-approved': 'check', 'production-assigned': 'box',
  'production-blocked': 'alert', 'production-resumed': 'box', 'qc-pending': 'check', 'qc-rework': 'alert',
  'qc-repeat-failure': 'alert', 'qc-passed': 'check', 'case-ready': 'box', 'case-completed': 'check',
  'case-accepted': 'check', 'case-message': 'message', 'note-mention': 'message'
};

function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }

// Three sections, in the order a person triages: what is waiting on them,
// what happened today, then everything older. A flat reverse-chronological
// list buries the one notification that needed acting on under six that
// did not.
function groupNotifications(list) {
  const t = S[effectiveLang()];
  const today = startOfToday();
  const action = [], now = [], earlier = [];
  for (const n of list) {
    if (level(n.type) !== 'info' && !n.read) action.push(n);
    else if (new Date(n.createdAt).getTime() >= today) now.push(n);
    else earlier.push(n);
  }
  return [[t.needsAttention, action], [t.today, now], [t.earlier, earlier]];
}

function notificationRow(n) {
  const clickable = CASE_TYPES.has(n.type) && n.relatedId;
  return '<' + (clickable ? 'button type="button"' : 'div') +
      ' class="notif-item notif-' + level(n.type) + (n.read ? '' : ' unread') + '"' +
      ' data-notif-id="' + esc(n.id) + '"' + (clickable ? ' data-notif-case="' + esc(n.relatedId) + '"' : '') + '>' +
    '<span class="notif-mark">' + icon(TYPE_ICON[n.type] || 'history') + '</span>' +
    '<span>' +
      '<span class="notif-title">' + esc(n.title) + '</span>' +
      (n.body ? '<span class="notif-body">' + esc(n.body) + '</span>' : '') +
      '<span class="notif-time">' + timeAgo(n.createdAt) + '</span>' +
    '</span>' +
  '</' + (clickable ? 'button' : 'div') + '>';
}

function renderDropdown() {
  const t = S[effectiveLang()];
  const list = DATA.notifications.slice(0, 30);
  if (!list.length) {
    return '<div class="notif-head"><span>' + t.notifications + '</span></div>' +
      '<p class="notif-empty">' + t.empty + '</p>';
  }
  const body = groupNotifications(list)
    .filter(([, rows]) => rows.length)
    .map(([label, rows]) => '<p class="notif-group">' + esc(label) + '</p>' + rows.map(notificationRow).join(''))
    .join('');
  return '<div class="notif-head"><span>' + t.notifications + '</span>' +
    (DATA.unreadNotifications ? '<button class="btn btn-ghost btn-sm" id="notifMarkAll">' + t.markAll + '</button>' : '') +
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
    // Clickable rows are real <button>s, so Enter and Space are handled by
    // the platform. An extra keydown listener here would fire the handler
    // twice on Enter and open the case on top of itself.
    el.addEventListener('click', open);
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
