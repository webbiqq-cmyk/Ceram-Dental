const { ok, bad } = require('../utils/respond');
const notificationModel = require('../models/notification.model');

// Available to whichever role is signed in (req.user set by
// requireAnyRole) — each portal only ever sees its own notifications.
function list(req, res) {
  const items = notificationModel.listFor(req.user.role);
  ok(res, { notifications: items, unread: items.filter(n => !n.read).length });
}

function markRead(req, res) {
  const n = notificationModel.markRead(req.params.id, req.user.role);
  if (!n) return bad(res, 'Unknown notification.');
  ok(res);
}

function markAllRead(req, res) {
  notificationModel.markAllRead(req.user.role);
  ok(res);
}

module.exports = { list, markRead, markAllRead };
