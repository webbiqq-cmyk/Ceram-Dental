const { ok } = require('../utils/respond');
const settingsModel = require('../models/settings.model');
const { logAction } = require('../utils/audit');

async function update(req, res) {
  const settings = await settingsModel.updateSettings(req.body || {});
  await logAction(req, 'settings:update', Object.keys(req.body || {}).join(', '));
  ok(res, { settings });
}

module.exports = { update };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
