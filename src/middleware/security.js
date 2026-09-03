const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// CSP note: the rendered HTML uses inline `style="..."` attributes
// extensively (e.g. animation stagger, background-image tiles) — rewriting
// all of that to external CSS is a much larger change than "harden what's
// here" calls for, so style-src keeps 'unsafe-inline'. script-src does NOT:
// there is no inline <script> anywhere in the app (index.html loads
// /js/app.js as an external module), so script injection — the
// higher-severity risk — stays fully blocked.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"] // the admin/portal/lab pages must never be iframe-embeddable (clickjacking)
    }
  },
  crossOriginEmbedderPolicy: false // would block the Google Fonts stylesheet
});

// Login endpoints: tight limit per IP, since this is exactly where a brute
// force / credential-stuffing attempt would land. Keyed by IP *and* role —
// admin/dentist/lab are meant to be three independent systems, so hammering
// (or just legitimately using) one shouldn't burn through another's
// allowance from the same office IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + ':' + req.params.role,
  message: { ok: false, error: 'Too many sign-in attempts. Try again in a few minutes.' }
});

// Everything else under /api — generous, since normal use hits /api/state
// on every navigation, but still a real ceiling against scripted abuse.
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please slow down.' }
});

module.exports = { helmetMiddleware, loginLimiter, apiLimiter };
