const { ok, bad } = require('../utils/respond');
const messageModel = require('../models/message.model');

function send(req, res) {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) return bad(res, 'Name, email and message are required.');
  const msg = messageModel.addMessage({ name, email, message });
  ok(res, { message: msg });
}

module.exports = { send };
