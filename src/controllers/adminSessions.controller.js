const { ok, bad } = require('../utils/respond');
const sessionModel = require('../models/session.model');
const { logAction } = require('../utils/audit');

// Admin-wide oversight: every active login session, across all three
// portals — "who's actually signed in right now, and on what kind of
// session (remembered device or not)".
function list(req, res) {
  ok(res, { sessions: sessionModel.listAll() });
}

function revoke(req, res) {
  const s = sessionModel.revoke(req.params.jti);
  if (!s) return bad(res, 'Unknown session.');
  logAction(req, 'session:revoke', s.username + ' (' + s.role + ')');
  ok(res);
}

module.exports = { list, revoke };
