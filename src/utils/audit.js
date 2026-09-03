const activityLog = require('../models/activityLog.model');

// Shorthand for the common case: log an action against the currently
// authenticated user (req.user, set by requireRole()).
function logAction(req, action, detail) {
  activityLog.log({ role: req.user.role, username: req.user.username, name: req.user.name, action, detail });
}

module.exports = { logAction };
