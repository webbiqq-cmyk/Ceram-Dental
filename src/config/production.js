// Central production configuration. Every deployment-specific value is read
// here once, with safe defaults so local/demo keeps working untouched. Nothing
// in this file is secret — secrets stay in process.env and never reach the
// client bundle.
const { IS_PRODUCTION } = require('./env');

const str = (v, d = '') => (typeof v === 'string' && v.trim() ? v.trim() : d);
const bool = (v, d = false) => (v == null ? d : /^(1|true|yes|on)$/i.test(String(v)));
const list = v => str(v).split(/[\s,]+/).filter(Boolean);

// --- Public URLs / hostnames (used for CORS, email links, section routing) ---
const WEB_URL    = str(process.env.WEB_URL || process.env.PUBLIC_URL);          // www.domain.com
const PORTAL_URL = str(process.env.PORTAL_URL);                                 // portal.domain.com  (Dentist)
const ADMIN_URL  = str(process.env.ADMIN_URL);                                  // admin-private.domain.com
const LAB_URL    = str(process.env.LAB_URL);                                    // lab-private.domain.com
const API_URL    = str(process.env.API_URL);                                    // api.domain.com (Render)

const hostOf = u => { try { return new URL(u).host.toLowerCase(); } catch { return ''; } };
const SECTION_HOSTS = {
  admin:  str(process.env.ADMIN_HOST,  hostOf(ADMIN_URL)),
  portal: str(process.env.PORTAL_HOST, hostOf(PORTAL_URL)),
  lab:    str(process.env.LAB_HOST,    hostOf(LAB_URL)),
  public: str(process.env.WEB_HOST,    hostOf(WEB_URL))
};

// --- CORS: which browser origins may call this API with credentials ---
// Defaults to the configured portal/admin/lab/web URLs; empty = same-origin only.
const CORS_ORIGINS = (list(process.env.CORS_ORIGINS).length
  ? list(process.env.CORS_ORIGINS)
  : [WEB_URL, PORTAL_URL, ADMIN_URL, LAB_URL].filter(Boolean)
).map(o => o.replace(/\/$/, ''));

// --- Cookies: share the session cookie across *.domain.com subdomains ---
const COOKIE_DOMAIN = str(process.env.COOKIE_DOMAIN);   // e.g. ".domain.com"

// --- Proxy / Cloudflare: how to find the real client IP safely ---
// TRUST_PROXY: 'cloudflare' (verify hop is a CF edge, then use CF-Connecting-IP),
//              a number (hop count for Express' trust proxy), or 'false'.
const TRUST_PROXY = str(process.env.TRUST_PROXY, process.env.VERCEL ? '1' : 'false');
const BEHIND_CLOUDFLARE = TRUST_PROXY === 'cloudflare' || bool(process.env.BEHIND_CLOUDFLARE);

// --- Lab Studio clinic IP allowlist ---
// Comma/space separated IPv4/IPv6 addresses or CIDR ranges. Add the clinic's
// static public IP here later — no code change needed.
const LAB_IP_ALLOWLIST = list(process.env.CLINIC_IP_ALLOWLIST || process.env.LAB_IP_ALLOWLIST);
// Enforced automatically once an allowlist exists; force with LAB_IP_ENFORCED.
const LAB_IP_ENFORCED = process.env.LAB_IP_ENFORCED != null
  ? bool(process.env.LAB_IP_ENFORCED)
  : (LAB_IP_ALLOWLIST.length > 0);

// --- Admin MFA (architecture is ready; enforcement is a flag) ---
const ADMIN_MFA_ENFORCED = bool(process.env.ADMIN_MFA_ENFORCED);

// --- SMTP (server-side only) ---
const SMTP = {
  host: str(process.env.SMTP_HOST),
  port: Number(process.env.SMTP_PORT) || 587,
  secure: bool(process.env.SMTP_SECURE, Number(process.env.SMTP_PORT) === 465),
  user: str(process.env.SMTP_USER),
  pass: str(process.env.SMTP_PASS),
  from: str(process.env.SMTP_FROM || process.env.SMTP_USER),
  configured: !!(str(process.env.SMTP_HOST) && str(process.env.SMTP_USER) && str(process.env.SMTP_PASS))
};

if (IS_PRODUCTION && !LAB_IP_ENFORCED) {
  console.warn('[production] CLINIC_IP_ALLOWLIST is empty — Lab Studio IP restriction is OFF. Set it before go-live.');
}

module.exports = {
  WEB_URL, PORTAL_URL, ADMIN_URL, LAB_URL, API_URL, SECTION_HOSTS,
  CORS_ORIGINS, COOKIE_DOMAIN, TRUST_PROXY, BEHIND_CLOUDFLARE,
  LAB_IP_ALLOWLIST, LAB_IP_ENFORCED, ADMIN_MFA_ENFORCED, SMTP,
  str, bool, list
};
