// Tracks every issued login session (JWT) so it can be listed and revoked —
// a JWT is normally "fire and forget" (valid until it expires, no way to
// undo), which is unacceptable once "remember this device" makes some of
// them last 30 days. Every token gets a jti (unique id); this is the
// server-side record of which jtis are still good.
//
// isRevoked() runs on *every single authenticated request* (it's inside
// verifyToken(), which every requireRole/readSession call goes through) —
// so it has to stay O(1), and the store behind it has to stay bounded no
// matter how many logins happen over the app's lifetime. A plain array
// with .find() (the original shape here) is O(n) per request and never
// shrinks — under sustained load, or just months of real logins, that's
// both a growing memory leak and ever-slower auth checks. A Map keyed by
// jti plus opportunistic pruning fixes both.
const sessions = new Map(); // jti -> record

// A record only needs to exist while it can still change the answer to
// isRevoked(): once its JWT has expired, jwt.verify() already rejects the
// token before isRevoked() is ever consulted, and isRevoked() treats a
// missing record as revoked (fail closed) — so dropping expired *or*
// revoked entries here is always safe, never loosens a check.
function prune() {
  const now = Date.now();
  for (const [jti, s] of sessions) {
    if (s.revoked || s.expiresAt < now) sessions.delete(jti);
  }
}

function recordSession({ jti, userId, username, role, name, remembered, issuedAt, expiresAt }) {
  // Login is already rate-limited (8/15min per IP+role), so paying an O(n)
  // prune here — instead of on the hot isRevoked() path — costs nothing
  // that matters and keeps the map from ever growing past "currently
  // active sessions".
  prune();
  const s = { jti, userId, username, role, name, remembered, issuedAt, expiresAt, revoked: false };
  sessions.set(jti, s);
  return s;
}

function isRevoked(jti) {
  const s = sessions.get(jti);
  return !s || s.revoked;
}

function revoke(jti) {
  const s = sessions.get(jti);
  if (!s) return null;
  s.revoked = true;
  return s;
}

// For a signed-in user checking their own active devices.
function listForUser(userId) {
  const now = Date.now();
  const out = [];
  for (const s of sessions.values()) {
    if (s.userId === userId && !s.revoked && s.expiresAt > now) out.push(s);
  }
  return out.sort((a, b) => b.issuedAt - a.issuedAt);
}

// For Admin's oversight view — every active session, across every role.
function listAll() {
  const now = Date.now();
  const out = [];
  for (const s of sessions.values()) {
    if (!s.revoked && s.expiresAt > now) out.push(s);
  }
  return out.sort((a, b) => b.issuedAt - a.issuedAt);
}

module.exports = { recordSession, isRevoked, revoke, listForUser, listAll };
