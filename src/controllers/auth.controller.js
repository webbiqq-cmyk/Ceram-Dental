const authService = require('../services/auth.service');
const userModel = require('../models/user.model');
const sessionModel = require('../models/session.model');
const activityLog = require('../models/activityLog.model');
const { ok, bad } = require('../utils/respond');
const { COOKIE_NAMES, COOKIE_OPTIONS, verifyRawToken } = require('../middleware/auth');

function isValidRole(role) { return userModel.ROLES.includes(role); }

function publicUser(u) { return { username: u.username, role: u.role, name: u.name }; }

async function login(req, res) {
  const role = req.params.role;
  if (!isValidRole(role)) return bad(res, 'Unknown login.');
  const { username, password, remember } = req.body || {};
  if (!username || !password) return bad(res, 'Username and password are required.');

  const user = await authService.login(username, password, role);
  if (!user) return bad(res, 'Incorrect username or password.');

  const { token, maxAgeMs } = authService.issueToken(user, { remember: !!remember });
  res.cookie(COOKIE_NAMES[role], token, Object.assign({}, COOKIE_OPTIONS, { maxAge: maxAgeMs }));
  activityLog.log({ role, username: user.username, name: user.name, action: 'login', detail: remember ? 'remembered device' : '' });
  ok(res, { user: publicUser(user), remembered: !!remember });
}

function logout(req, res) {
  const role = req.params.role;
  if (!isValidRole(role)) return bad(res, 'Unknown login.');
  const token = req.cookies && req.cookies[COOKIE_NAMES[role]];
  if (token) {
    // Not just clearing the cookie — actually revoking the session server
    // side, so a copy of that cookie taken before logout can't still be
    // replayed (this matters more than usual here since "remember me"
    // sessions can live for 30 days).
    const decoded = verifyRawToken(token);
    if (decoded && decoded.jti) {
      sessionModel.revoke(decoded.jti);
      activityLog.log({ role, username: decoded.username, name: decoded.name, action: 'logout', detail: '' });
    }
  }
  res.clearCookie(COOKIE_NAMES[role], { path: '/' });
  ok(res);
}

function me(req, res) {
  // req.user is set by requireRole() — reaching here means the session is valid
  ok(res, { user: { username: req.user.username, role: req.user.role, name: req.user.name, remembered: !!req.user.remembered } });
}

async function changePassword(req, res) {
  const role = req.params.role;
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return bad(res, 'Current and new password are required.');
  if (String(newPassword).length < 10) return bad(res, 'New password must be at least 10 characters.');

  const user = userModel.findById(req.user.sub);
  if (!user) return bad(res, 'Account not found.');
  const verified = await authService.login(user.username, currentPassword, role);
  if (!verified) return bad(res, 'Current password is incorrect.');

  const hash = await authService.hashPassword(newPassword);
  userModel.setPasswordHash(user.id, hash);
  ok(res);
}

// A signed-in user's own list of active "remembered" devices/sessions —
// lets someone see (and, via /api/admin/sessions, lets Admin see for
// everyone) what's actually still logged in, not just trust that it is.
function mySessions(req, res) {
  const sessions = sessionModel.listForUser(req.user.sub).map(s => ({
    jti: s.jti, remembered: s.remembered, issuedAt: s.issuedAt, expiresAt: s.expiresAt, isCurrent: s.jti === req.user.jti
  }));
  ok(res, { sessions });
}

module.exports = { login, logout, me, changePassword, mySessions };
