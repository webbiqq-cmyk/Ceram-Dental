// MFA-ready architecture. The DB carries mfa_enabled / mfa_secret per user
// (migration 010) and the login flow calls requireMfaStep(). Actual TOTP
// verification is a small, isolated addition later — implement verifyTotp()
// with a library or an HMAC-SHA1 routine and flip nothing else.
const { ADMIN_MFA_ENFORCED } = require('../config/production');

// Does this user still owe a second factor after a correct password?
function mfaRequiredFor(user) {
  if (!user) return false;
  if (user.mfaEnabled || user.mfa_enabled) return true;
  return ADMIN_MFA_ENFORCED && user.role === 'admin';
}

// Placeholder — returns false until TOTP is implemented, so enabling MFA
// enforcement without implementing verification fails closed (safe).
function verifyTotp(_secret, _code) {
  return false;
}

module.exports = { mfaRequiredFor, verifyTotp };
