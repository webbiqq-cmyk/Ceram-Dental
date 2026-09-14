const records = require('../db/records');
const { nextId } = require('../utils/ids');

const messages = [];

async function addMessage({ name, email, message }) {
  const msg = { id: nextId('message', 'MSG-'), name, email, message, read: false, createdAt: new Date() };
  await records.insert('messages', msg);
  return msg;
}

// Admin opens a message → mark it read, so the inbox can show what's
// actually new. Deleting is for cleared/spam messages once handled.
async function markRead(id) { return records.update('messages', id, row => { row.read = true; }); }
async function remove(id) { return records.remove('messages', id); }

records.register('messages', messages);
async function list(options) { return records.list('messages', options); }
module.exports = { list, messages, addMessage, markRead, remove };
