// Credentialed CORS, allowlist only. Needed once the API lives on its own
// origin (api.domain.com) and the portals call it from portal./admin./lab.
// If CORS_ORIGINS is empty the API is same-origin only and this is a no-op.
const { CORS_ORIGINS } = require('../config/production');

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin.replace(/\/$/, ''))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

module.exports = { corsMiddleware };
