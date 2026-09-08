const crypto = require('crypto');
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// DEMO_MODE is a deliberate, explicit escape hatch for client walkthroughs
// on a hosted URL (e.g. Vercel, where NODE_ENV is always "production"):
// it runs the whole platform on in-memory storage with login disabled,
// exactly like local dev. Data resets on every cold start — it is NOT for
// real patient data. To go live: remove DEMO_MODE and set DATABASE_URL +
// a 32+ byte JWT_SECRET. Without DEMO_MODE, production stays locked as before.
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Keep the local/test demo usable without provisioning accounts. Production
// remains locked by default; deployments can explicitly enable login in any
// non-production preview with REQUIRE_LOGIN=true.
const LOGIN_REQUIRED = DEMO_MODE ? false
  : IS_PRODUCTION ? process.env.REQUIRE_LOGIN !== 'false'
  : process.env.REQUIRE_LOGIN === 'true';
if (IS_PRODUCTION && !DEMO_MODE && !LOGIN_REQUIRED) throw new Error('Production requires authentication. Remove REQUIRE_LOGIN=false.');
if (IS_PRODUCTION && !DEMO_MODE && !process.env.DATABASE_URL) throw new Error('Production requires DATABASE_URL; memory storage is development-only.');
let JWT_SECRET = process.env.JWT_SECRET;
if (IS_PRODUCTION && !DEMO_MODE && (!JWT_SECRET || Buffer.byteLength(JWT_SECRET) < 32)) throw new Error('Production requires a JWT_SECRET of at least 32 bytes.');
if (!JWT_SECRET) JWT_SECRET = crypto.randomBytes(48).toString('base64');

if (DEMO_MODE) console.warn('\n⚠  DEMO_MODE: in-memory storage, no login, data resets on restart. Not for real data.\n');
function integer(name, fallback, min, max) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('Invalid configuration: ' + name);
  return value;
}
module.exports = { NODE_ENV, IS_PRODUCTION, DEMO_MODE, LOGIN_REQUIRED, JWT_SECRET, integer,
  SESSION_TTL_HOURS: integer('SESSION_TTL_HOURS', 12, 1, 72),
  REMEMBER_TTL_DAYS: integer('REMEMBER_TTL_DAYS', 30, 1, 90) };
