const { ok } = require('../utils/respond');
const settingsModel = require('../models/settings.model');
const { logAction } = require('../utils/audit');

function update(req, res) {
  const settings = settingsModel.updateSettings(req.body || {});
  logAction(req, 'settings:update', Object.keys(req.body || {}).join(', '));
  ok(res, { settings });
}

module.exports = { update };
