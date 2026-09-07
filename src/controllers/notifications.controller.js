const { ok, bad } = require('../utils/respond');
const notificationModel = require('../models/notification.model');

// Available to whichever role is signed in (req.user set by
// requireAnyRole) — each portal only ever sees its own notifications.
async function list(req, res) {
  const items = await notificationModel.listFor(req.user.role, req.user.sub);
  ok(res, { notifications: items, unread: items.filter(n => !n.read).length });
}

async function markRead(req, res) {
  const n = await notificationModel.markRead(req.params.id, req.user.role, req.user.sub);
  if (!n) return bad(res, 'Unknown notification.');
  ok(res);
}

async function markAllRead(req, res) {
  await notificationModel.markAllRead(req.user.role, req.user.sub);
  ok(res);
}

module.exports = { list, markRead, markAllRead };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
