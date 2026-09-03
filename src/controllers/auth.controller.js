const authService = require('../services/auth.service');
const userModel = require('../models/user.model');
const { ok, bad } = require('../utils/respond');
const { COOKIE_NAMES, COOKIE_OPTIONS } = require('../middleware/auth');

function isValidRole(role) { return userModel.ROLES.includes(role); }

function publicUser(u) { return { username: u.username, role: u.role, name: u.name }; }

async function login(req, res) {
  const role = req.params.role;
  if (!isValidRole(role)) return bad(res, 'Unknown login.');
  const { username, password } = req.body || {};
  if (!username || !password) return bad(res, 'Username and password are required.');

  const user = await authService.login(username, password, role);
  if (!user) return bad(res, 'Incorrect username or password.');

  const token = authService.issueToken(user);
  res.cookie(COOKIE_NAMES[role], token, Object.assign({}, COOKIE_OPTIONS, {
    maxAge: authService.SESSION_TTL_HOURS * 60 * 60 * 1000
  }));
  ok(res, { user: publicUser(user) });
}

function logout(req, res) {
  const role = req.params.role;
  if (!isValidRole(role)) return bad(res, 'Unknown login.');
  res.clearCookie(COOKIE_NAMES[role], { path: '/' });
  ok(res);
}

function me(req, res) {
  // req.user is set by requireRole() — reaching here means the session is valid
  ok(res, { user: { username: req.user.username, role: req.user.role, name: req.user.name } });
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

module.exports = { login, logout, me, changePassword };
