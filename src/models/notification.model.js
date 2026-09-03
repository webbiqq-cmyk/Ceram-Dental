// In-app notifications, targeted per role (or 'all' three) — the practical,
// works-everywhere alternative to OS push notifications for this stage:
// no service worker, no browser permission prompt, no VAPID keys, works
// identically on phone/tablet/desktop the moment the portal is open. Real
// push is a documented follow-up once there's a persistent database to
// store push subscriptions in (see README).
const { nextId } = require('../utils/ids');

const notifications = [];

function notify(role, { type, title, body, relatedId }) {
  const n = { id: nextId('notification', 'NTF-'), role, type, title, body: body || '', relatedId: relatedId || '', read: false, createdAt: new Date() };
  notifications.unshift(n);
  if (notifications.length > 1000) notifications.length = 1000;
  return n;
}

function listFor(role) {
  return notifications.filter(n => n.role === role || n.role === 'all');
}

function markRead(id, role) {
  const n = notifications.find(x => x.id === id && (x.role === role || x.role === 'all'));
  if (!n) return null;
  n.read = true;
  return n;
}

function markAllRead(role) {
  listFor(role).forEach(n => { n.read = true; });
}

module.exports = { notifications, notify, listFor, markRead, markAllRead };
