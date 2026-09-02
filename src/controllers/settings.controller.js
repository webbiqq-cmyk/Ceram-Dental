const { ok } = require('../utils/respond');
const settingsModel = require('../models/settings.model');

function update(req, res) {
  const settings = settingsModel.updateSettings(req.body || {});
  ok(res, { settings });
}

module.exports = { update };
