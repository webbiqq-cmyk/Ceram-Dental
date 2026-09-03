// A record of who did what — the point isn't to be a full audit trail of
// every field change, it's so Admin can answer "did someone actually do
// this" without having to trust everyone's word for it.
const { nextId } = require('../utils/ids');

const entries = [];

function log({ role, username, name, action, detail }) {
  const entry = {
    id: nextId('activity', 'ACT-'),
    role, username, name: name || username,
    action, detail: detail || '',
    at: new Date()
  };
  entries.unshift(entry);
  // Keep this bounded — it's an in-memory demo store, not a database;
  // without a cap a long-running process would grow this array forever.
  if (entries.length > 2000) entries.length = 2000;
  return entry;
}

function list({ username, role, from, to, limit } = {}) {
  let rows = entries;
  if (username) rows = rows.filter(e => e.username === username);
  if (role) rows = rows.filter(e => e.role === role);
  if (from) rows = rows.filter(e => new Date(e.at) >= new Date(from));
  if (to) rows = rows.filter(e => new Date(e.at) <= new Date(to));
  return rows.slice(0, limit || 200);
}

module.exports = { log, list };
