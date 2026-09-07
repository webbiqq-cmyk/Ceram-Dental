const { ok, bad } = require('../utils/respond');
const messageModel = require('../models/message.model');
const notificationModel = require('../models/notification.model');

async function send(req, res) {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) return bad(res, 'Name, email and message are required.');
  const msg = await messageModel.addMessage({ name, email, message });
  await notificationModel.notify('admin', { type: 'message-new', title: 'New contact message', body: msg.name, relatedId: msg.id });
  ok(res, { message: msg });
}

module.exports = { send };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
