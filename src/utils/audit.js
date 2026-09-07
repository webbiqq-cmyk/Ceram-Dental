const activityLog = require('../models/activityLog.model');

// Shorthand for the common case: log an action against the currently
// authenticated user (req.user, set by requireRole()).
async function logAction(req, action, detail) {
  return activityLog.log({ role: req.user.role, username: req.user.username, name: req.user.name, action, detail });
}

module.exports = { logAction };
