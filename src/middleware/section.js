// Maps the request hostname to a logical section (public | portal | admin |
// lab) so the same codebase can later be served from portal.domain.com /
// admin-private.domain.com / lab-private.domain.com without a rebuild.
//
// While SECTION_HOSTS is unset (single-domain / local), every section is
// allowed everywhere and these are no-ops.
const { SECTION_HOSTS } = require('../config/production');

const CONFIGURED = Object.values(SECTION_HOSTS).some(Boolean);

function sectionForHost(host) {
  host = String(host || '').toLowerCase().split(':')[0];
  for (const [name, h] of Object.entries(SECTION_HOSTS)) if (h && host === h) return name;
  return 'public';
}

function resolveSection(req, _res, next) {
  req.section = CONFIGURED ? sectionForHost(req.hostname || req.headers.host) : null;
  next();
}

// Guard: block a route group when it's reached from the wrong subdomain
// (defence in depth on top of the auth/role checks). Inert until hosts are
// configured.
function restrictToSection(...allowed) {
  return (req, res, next) => {
    if (!CONFIGURED || !req.section || allowed.includes(req.section)) return next();
    return res.status(404).json({ ok: false, error: 'Not found.' });
  };
}

module.exports = { resolveSection, restrictToSection, sectionForHost, SECTION_CONFIGURED: CONFIGURED };
