const { ok } = require('../utils/respond');
const activityLog = require('../models/activityLog.model');

function list(req, res) {
  const { username, role, from, to } = req.query || {};
  ok(res, { activity: activityLog.list({ username, role, from, to, limit: 300 }) });
}

module.exports = { list };
