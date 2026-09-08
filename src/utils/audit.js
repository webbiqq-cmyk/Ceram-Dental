const activityLog = require('../models/activityLog.model');

// Log an action against the currently authenticated user (req.user, set by
// requireRole()). Captures IP and session id for the audit trail. Pass a
// string detail (back-compat) or an { detail, resourceType, resourceId, meta }
// object for structured entries.
async function logAction(req, action, info) {
  const extra = typeof info === 'string' ? { detail: info, resourceId: info } : (info || {});
  return activityLog.log({
    userId: req.user?.sub,
    role: req.user?.role,
    username: req.user?.username,
    name: req.user?.name,
    action,
    ip: req.clientIp,
    sessionId: req.user?.jti,
    ...extra
  });
}

// Log an event that has no authenticated user yet (e.g. a failed login).
async function logEvent(req, action, info = {}) {
  return activityLog.log({ action, ip: req?.clientIp, ...info });
}

module.exports = { logAction, logEvent };
