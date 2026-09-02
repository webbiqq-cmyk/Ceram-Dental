const { nextId } = require('../utils/ids');

const messages = [];

function addMessage({ name, email, message }) {
  const msg = { id: nextId('message', 'MSG-'), name, email, message, createdAt: new Date() };
  messages.unshift(msg);
  return msg;
}

module.exports = { messages, addMessage };
