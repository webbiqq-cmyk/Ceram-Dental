const { ok } = require('../utils/respond');
const activityLog = require('../models/activityLog.model');

async function list(req, res) {
  const { username, role, from, to } = req.query || {};
  ok(res, { activity: await activityLog.list({ username, role, from, to, limit: 300 }) });
}

module.exports = { list };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
