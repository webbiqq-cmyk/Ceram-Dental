const { ok, bad } = require('../utils/respond');
const sessionModel = require('../models/session.model');
const { logAction } = require('../utils/audit');

// Admin-wide oversight: every active login session, across all three
// portals — "who's actually signed in right now, and on what kind of
// session (remembered device or not)".
async function list(req, res) {
  ok(res, { sessions: await sessionModel.listAll() });
}

async function revoke(req, res) {
  const s = await sessionModel.revoke(req.params.jti);
  if (!s) return bad(res, 'Unknown session.');
  await logAction(req, 'session:revoke', s.username + ' (' + s.role + ')');
  ok(res);
}

module.exports = { list, revoke };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
