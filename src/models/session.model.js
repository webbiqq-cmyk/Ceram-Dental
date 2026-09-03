// Tracks every issued login session (JWT) so it can be listed and revoked —
// a JWT is normally "fire and forget" (valid until it expires, no way to
// undo), which is unacceptable once "remember this device" makes some of
// them last 30 days. Every token gets a jti (unique id); this is the
// server-side record of which jtis are still good.
const sessions = [];

function recordSession({ jti, userId, username, role, name, remembered, issuedAt, expiresAt }) {
  const s = { jti, userId, username, role, name, remembered, issuedAt, expiresAt, revoked: false };
  sessions.unshift(s);
  return s;
}

function isRevoked(jti) {
  const s = sessions.find(x => x.jti === jti);
  return !s || s.revoked;
}

function revoke(jti) {
  const s = sessions.find(x => x.jti === jti);
  if (!s) return null;
  s.revoked = true;
  return s;
}

// For a signed-in user checking their own active devices.
function listForUser(userId) {
  const now = Date.now();
  return sessions.filter(s => s.userId === userId && !s.revoked && s.expiresAt > now);
}

// For Admin's oversight view — every active session, across every role.
function listAll() {
  const now = Date.now();
  return sessions.filter(s => !s.revoked && s.expiresAt > now);
}

module.exports = { recordSession, isRevoked, revoke, listForUser, listAll };
