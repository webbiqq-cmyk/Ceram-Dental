// Role-gated route protection. Each role gets its own cookie name — logging
// into the Dentist Portal never sets anything the Admin or Lab check reads,
// so the three portals are isolated at the cookie level, not just by a
// role field inside one shared token.
const { verifyToken } = require('../services/auth.service');

const COOKIE_NAMES = { admin: 'admin_session', dentist: 'dentist_session', lab: 'lab_session' };

const COOKIE_OPTIONS = {
  httpOnly: true, // never readable from client-side JS — an XSS bug can't exfiltrate the session
  secure: process.env.NODE_ENV === 'production', // HTTPS-only in production; allows local http:// dev
  sameSite: 'strict', // never sent on a cross-site request — the main practical CSRF defense here
  path: '/',
  maxAge: undefined // set per-issue to match the JWT's own expiry
};

function cookieNameFor(role) { return COOKIE_NAMES[role]; }

// Decode+verify a token without knowing its role in advance — used by
// logout to find the jti to revoke.
function verifyRawToken(token) { return verifyToken(token); }

function readSession(req, role) {
  const name = COOKIE_NAMES[role];
  if (!name) return null;
  const token = req.cookies && req.cookies[name];
  if (!token) return null;
  const decoded = verifyToken(token);
  // Defense in depth: even if a token somehow ended up under the wrong
  // cookie name, it's rejected unless its own role claim matches too.
  if (!decoded || decoded.role !== role) return null;
  return decoded;
}

function requireRole(role) {
  return (req, res, next) => {
    const session = readSession(req, role);
    if (!session) return res.status(401).json({ ok: false, error: 'Sign in required.' });
    req.user = session;
    next();
  };
}

// For cases.controller.js's action endpoint, which is shared by both the
// Dentist Portal and Lab Studio but each is only allowed a subset of
// actions on it (see cases.controller.js).
function requireAnyRole(roles) {
  return (req, res, next) => {
    for (const role of roles) {
      const session = readSession(req, role);
      if (session) { req.user = session; return next(); }
    }
    return res.status(401).json({ ok: false, error: 'Sign in required.' });
  };
}

// For routes like /api/auth/:role/me where the role is part of the URL
// itself rather than fixed at route-definition time.
function requireRoleParam(req, res, next) {
  const role = req.params.role;
  if (!COOKIE_NAMES[role]) return res.status(400).json({ ok: false, error: 'Unknown login.' });
  const session = readSession(req, role);
  if (!session) return res.status(401).json({ ok: false, error: 'Sign in required.' });
  req.user = session;
  next();
}

module.exports = { COOKIE_NAMES, COOKIE_OPTIONS, cookieNameFor, readSession, requireRole, requireAnyRole, requireRoleParam, verifyRawToken };
