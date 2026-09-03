const { ok, bad } = require('../utils/respond');
const messageModel = require('../models/message.model');
const notificationModel = require('../models/notification.model');

function send(req, res) {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) return bad(res, 'Name, email and message are required.');
  const msg = messageModel.addMessage({ name, email, message });
  notificationModel.notify('admin', { type: 'message-new', title: 'New contact message', body: msg.name, relatedId: msg.id });
  ok(res, { message: msg });
}

module.exports = { send };
