const { ok, bad } = require('../utils/respond');
const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const { logAction } = require('../utils/audit');

function list(req, res) {
  ok(res, { users: userModel.list() });
}

async function create(req, res) {
  const { username, password, role, name } = req.body || {};
  if (!username || !password || !role) return bad(res, 'Username, password and role are required.');
  if (!userModel.ROLES.includes(role)) return bad(res, 'Unknown role.');
  if (String(password).length < 10) return bad(res, 'Password must be at least 10 characters.');
  const passwordHash = await authService.hashPassword(password);
  const user = userModel.createUser({ username, passwordHash, role, name });
  if (!user) return bad(res, 'That username already exists for this role.');
  logAction(req, 'user:create', user.username + ' (' + user.role + ')');
  ok(res, { user });
}

function update(req, res) {
  const { name, active } = req.body || {};
  let user = userModel.findById(req.params.id);
  if (!user) return bad(res, 'Unknown account.');
  if (name !== undefined) userModel.updateName(req.params.id, name);
  if (active !== undefined) {
    const result = userModel.setActive(req.params.id, !!active);
    if (result.error) return bad(res, result.error);
  }
  logAction(req, 'user:update', userModel.findById(req.params.id).username);
  ok(res, { user: userModel.publicView(userModel.findById(req.params.id)) });
}

async function resetPassword(req, res) {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 10) return bad(res, 'New password must be at least 10 characters.');
  const user = userModel.findById(req.params.id);
  if (!user) return bad(res, 'Unknown account.');
  const hash = await authService.hashPassword(newPassword);
  userModel.setPasswordHash(user.id, hash);
  logAction(req, 'user:reset-password', user.username);
  ok(res);
}

function remove(req, res) {
  const user = userModel.findById(req.params.id);
  if (!user) return bad(res, 'Unknown account.');
  const result = userModel.removeUser(req.params.id);
  if (result.error) return bad(res, result.error);
  logAction(req, 'user:delete', user.username + ' (' + user.role + ')');
  ok(res);
}

module.exports = { list, create, update, resetPassword, remove };
