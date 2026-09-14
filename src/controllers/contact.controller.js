const { ok, bad } = require('../utils/respond');
const messageModel = require('../models/message.model');
const notificationModel = require('../models/notification.model');
const { logAction } = require('../utils/audit');

async function send(req, res) {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) return bad(res, 'Name, email and message are required.');
  const msg = await messageModel.addMessage({ name, email, message });
  await notificationModel.notify('admin', { type: 'message-new', title: 'New contact message', body: msg.name, relatedId: msg.id });
  ok(res, { message: msg });
}

async function markRead(req, res) {
  const msg = await messageModel.markRead(req.params.id);
  if (!msg) return bad(res, 'Unknown message.');
  ok(res, { message: msg });
}

async function remove(req, res) {
  const done = await messageModel.remove(req.params.id);
  if (!done) return bad(res, 'Unknown message.');
  await logAction(req, 'message:delete', req.params.id);
  ok(res);
}

module.exports = { send, markRead, remove };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
