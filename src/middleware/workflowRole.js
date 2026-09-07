// A handful of /api/orders endpoints (list, chat, files, staff) are
// legitimately shared across several roles — reception, designer,
// technician, QC and admin can all open the same order. That's fine with
// real per-role login: each has its own cookie, and requireAnyRole
// correctly finds whichever one is actually present.
//
// It breaks while login stays disabled (see src/middleware/auth.js):
// every role's session check returns an open session unconditionally, so
// requireAnyRole(['dentist','receptionist',...])'s first-match-wins
// behavior always resolves to the same one role — whichever is listed
// first — no matter which dashboard actually sent the request. Each of
// these dashboards already knows which role it is, so it says so
// explicitly (?asRole=... or body.asRole — deliberately not `role`,
// which /api/staff already uses for "which roster to fetch" and would
// otherwise collide with it) and this narrows the check to just that
// role instead of the whole list. This is a disambiguation hint, not a
// bypass: requireAnyRole([claimed]) still runs the real readSession
// check for that role, so once REQUIRE_LOGIN=true a claimed role with no
// matching cookie still correctly 401s.
const { requireAnyRole } = require('./auth');

function requireWorkflowRole(allowedRoles) {
  return (req, res, next) => {
    const claimed = (req.query && req.query.asRole) || (req.body && req.body.asRole);
    const roles = (claimed && allowedRoles.includes(claimed)) ? [claimed] : allowedRoles;
    return requireAnyRole(roles)(req, res, next);
  };
}

module.exports = { requireWorkflowRole };
