// Central place to read process.env — so every other file imports config
// from here instead of touching process.env directly, and there's one spot
// to see what the app actually depends on.
const crypto = require('crypto');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (IS_PRODUCTION) {
    // Never run production auth on a secret nobody chose — fail loudly
    // instead of silently issuing tokens a redeploy would invalidate
    // anyway (or worse, a predictable one).
    throw new Error(
      'JWT_SECRET is not set. Set it in the deployment environment ' +
      '(a long random string — e.g. `node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"`).'
    );
  }
  // Local/dev convenience only: a random secret generated fresh per
  // process start. Every restart invalidates existing sessions, which is
  // fine for local development and is exactly why this path never runs
  // in production.
  JWT_SECRET = crypto.randomBytes(48).toString('base64');
  console.warn('[env] JWT_SECRET not set — using a throwaway dev secret (all sessions reset on restart). Set JWT_SECRET before deploying.');
}

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  JWT_SECRET,
  SESSION_TTL_HOURS: Number(process.env.SESSION_TTL_HOURS) || 12,
  // "Remember this device" sessions — opt-in at login, still fully
  // revocable (see src/models/session.model.js), just longer-lived.
  REMEMBER_TTL_DAYS: Number(process.env.REMEMBER_TTL_DAYS) || 30
};
