const crypto = require('node:crypto');
const authService = require('../services/auth.service');
const userModel = require('../models/user.model');
const sessionModel = require('../models/session.model');
const activityLog = require('../models/activityLog.model');
const { mfaRequiredFor, verifyTotp } = require('../services/mfa.service');
const email = require('../services/email.service');
const records = require('../db/records');
const { pool, query } = require('../db/pool');
const { PORTAL_URL, ADMIN_URL, WEB_URL } = require('../config/production');
const { ok, bad } = require('../utils/respond');
const { COOKIE_NAMES, COOKIE_OPTIONS, verifyRawToken } = require('../middleware/auth');

function isValidRole(role) { return userModel.ROLES.includes(role); }

function publicUser(u) { return { username: u.username, role: u.role, name: u.name }; }

async function login(req, res) {
  const role = req.params.role;
  if (!isValidRole(role)) return bad(res, 'Unknown login.');
  const { username, password, remember } = req.body || {};
  if (!username || !password) return bad(res, 'Username and password are required.');

  let user;
  try { user = await authService.login(username, password, role); }
  catch (err) { return bad(res, 'Unable to sign in right now. Please try again.'); }

  if (!user) {
    const attempted = await userModel.findByUsernameAndRole(username, role);
    if (attempted) await userModel.recordLoginResult(attempted.id, { success: false, ip: req.clientIp });
    await activityLog.log({ userId: attempted?.id, role, username: String(username).slice(0, 100), action: 'login-failed', detail: attempted ? 'wrong password' : 'unknown user', ip: req.clientIp });
    return bad(res, 'Incorrect username or password.');
  }
  if (await userModel.isLocked(user.id)) {
    await activityLog.log({ userId: user.id, role, username: user.username, action: 'login-blocked', detail: 'account locked', ip: req.clientIp });
    return res.status(429).json({ ok: false, error: 'Too many failed attempts. Try again later.' });
  }

  // MFA-ready: if the account requires a second factor, no session is issued
  // until it verifies. verifyTotp() is a stub today, so MFA-enforced accounts
  // fail closed by design.
  if (mfaRequiredFor(user)) {
    const code = (req.body || {}).mfaCode;
    if (!code || !verifyTotp(user.mfa_secret || user.mfaSecret, code)) {
      await activityLog.log({ userId: user.id, role, username: user.username, action: 'login-mfa-required', ip: req.clientIp });
      return res.status(401).json({ ok: false, error: 'A verification code is required.', mfaRequired: true });
    }
  }

  const { token, maxAgeMs } = await authService.issueToken(user, { remember: !!remember });
  res.cookie(COOKIE_NAMES[role], token, Object.assign({}, COOKIE_OPTIONS, { maxAge: maxAgeMs }));
  await userModel.recordLoginResult(user.id, { success: true, ip: req.clientIp });
  await activityLog.log({ userId: user.id, role, username: user.username, name: user.name, action: 'login', detail: remember ? 'remembered device' : '', ip: req.clientIp });
  ok(res, { user: publicUser(user), remembered: !!remember });
}

async function registerDentist(req, res) {
  const { username, password, name, phone, email, accountType, company } = req.body || {};
  if (!username || !password || !name || !phone || !email || !['clinic','individual'].includes(accountType)) return bad(res, 'Name, username, password, phone, email and account type are required.');
  if (accountType === 'clinic' && !String(company || '').trim()) return bad(res, 'Clinic or company name is required.');
  if (String(password).length < 10) return bad(res, 'Password must be at least 10 characters.');
  const passwordHash = await authService.hashPassword(password);
  const user = await userModel.createUser({ username, passwordHash, role:'dentist', name, phone, email, accountType, company:accountType === 'clinic' ? company : 'Individual use' });
  if (!user) return bad(res, 'That username already exists.');
  const { token, maxAgeMs } = await authService.issueToken(user);
  res.cookie(COOKIE_NAMES.dentist, token, Object.assign({}, COOKIE_OPTIONS, { maxAge:maxAgeMs }));
  ok(res, { user: publicUser(user) });
}

async function logout(req, res) {
  const role = req.params.role;
  if (!isValidRole(role)) return bad(res, 'Unknown login.');
  const token = req.cookies && req.cookies[COOKIE_NAMES[role]];
  if (token) {
    // Not just clearing the cookie — actually revoking the session server
    // side, so a copy of that cookie taken before logout can't still be
    // replayed (this matters more than usual here since "remember me"
    // sessions can live for 30 days).
    const decoded = await verifyRawToken(token);
    if (decoded && decoded.jti) {
      await sessionModel.revoke(decoded.jti);
      await activityLog.log({ role, username: decoded.username, name: decoded.name, action: 'logout', detail: '' });
    }
  }
  res.clearCookie(COOKIE_NAMES[role], { path: '/' });
  ok(res);
}

async function me(req, res) {
  // req.user is set by requireRole() — reaching here means the session is valid
  ok(res, { user: { username: req.user.username, role: req.user.role, name: req.user.name, remembered: !!req.user.remembered } });
}

async function changePassword(req, res) {
  const role = req.params.role;
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return bad(res, 'Current and new password are required.');
  if (String(newPassword).length < 10) return bad(res, 'New password must be at least 10 characters.');

  const user = await userModel.findById(req.user.sub);
  if (!user) return bad(res, 'Account not found.');
  const verified = await authService.login(user.username, currentPassword, role);
  if (!verified) return bad(res, 'Current password is incorrect.');

  const hash = await authService.hashPassword(newPassword);
  await userModel.setPasswordHash(user.id, hash);
  ok(res);
}

// A signed-in user's own list of active "remembered" devices/sessions —
// lets someone see (and, via /api/admin/sessions, lets Admin see for
// everyone) what's actually still logged in, not just trust that it is.
async function mySessions(req, res) {
  const sessions = (await sessionModel.listForUser(req.user.sub)).map(s => ({
    jti: s.jti, remembered: s.remembered, issuedAt: s.issuedAt, expiresAt: s.expiresAt, isCurrent: s.jti === req.user.jti
  }));
  ok(res, { sessions });
}

// --- Password reset over SMTP ---
const RESET_TTL_MS = 60 * 60 * 1000;
records.register('password_resets');
const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex');
function resetBaseUrl(role) {
  if (role === 'admin') return ADMIN_URL || WEB_URL || '';
  if (['dentist', 'in_house_dentist'].includes(role)) return PORTAL_URL || WEB_URL || '';
  return WEB_URL || '';
}

async function forgotPassword(req, res) {
  const role = req.params.role;
  if (!isValidRole(role)) return bad(res, 'Unknown login.');
  const address = String((req.body || {}).email || '').trim();
  // Always 200 — never reveal whether an address is registered.
  try {
    const user = await userModel.findByEmailAndRole(address, role);
    if (user && user.active) {
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + RESET_TTL_MS);
      if (pool) {
        await query('INSERT INTO password_reset_tokens (token_hash, user_id, role, expires_at) VALUES ($1,$2,$3,$4)',
          [hashToken(token), user.id, role, expiresAt]);
      } else {
        await records.put('password_resets', { id: hashToken(token), userId: user.id, role, expiresAt: expiresAt.getTime() });
      }
      const base = resetBaseUrl(role);
      await email.sendPasswordReset({
        to: user.email, name: user.name,
        resetUrl: `${base}${base.endsWith('/') ? '' : '/'}#/reset?token=${token}&role=${role}`
      });
      await activityLog.log({ userId: user.id, role, username: user.username, action: 'password-reset-requested', ip: req.clientIp });
    }
  } catch (e) { console.error('[auth] forgot-password:', e.code || e.message); }
  ok(res, { sent: true });
}

async function resetPassword(req, res) {
  const role = req.params.role;
  if (!isValidRole(role)) return bad(res, 'Unknown login.');
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return bad(res, 'Token and new password are required.');
  if (String(newPassword).length < 10) return bad(res, 'New password must be at least 10 characters.');

  const th = hashToken(token);
  let userId = null;
  if (pool) {
    const { rows } = await query(
      'SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND role=$2 AND used_at IS NULL AND expires_at > now()',
      [th, role]);
    if (!rows[0]) return bad(res, 'This reset link is invalid or has expired.');
    userId = rows[0].user_id;
    await query('UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1', [th]);
  } else {
    const rec = await records.get('password_resets', th);
    if (!rec || rec.role !== role || rec.expiresAt <= Date.now()) return bad(res, 'This reset link is invalid or has expired.');
    userId = rec.userId;
    await records.remove('password_resets', th);
  }
  const hash = await authService.hashPassword(newPassword);
  await userModel.setPasswordHash(userId, hash); // also revokes all sessions
  await activityLog.log({ userId, role, action: 'password-reset-completed', ip: req.clientIp });
  ok(res, { reset: true });
}

module.exports = { login: login, registerDentist, logout, me, changePassword: changePassword, mySessions, forgotPassword, resetPassword };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
