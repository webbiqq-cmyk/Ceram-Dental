const records = require('../db/records');
const { nextId } = require('../utils/ids');

const messages = [];

async function addMessage({ name, email, message }) {
  const msg = { id: nextId('message', 'MSG-'), name, email, message, createdAt: new Date() };
  await records.insert('messages', msg);
  return msg;
}

records.register('messages', messages);
async function list(options) { return records.list('messages', options); }
module.exports = { list, messages, addMessage };
