// Lab Studio network restriction. Every Lab Studio backend route runs this
// AFTER an auth check, so by here we know the user; we additionally require
// the request to originate from an approved clinic IP.
//
// Enforcement is driven entirely by env (CLINIC_IP_ALLOWLIST). Add the
// clinic's static public IP there later — no source change. When the
// allowlist is empty and LAB_IP_ENFORCED isn't forced on, this is a no-op
// so local/demo keeps working.
const { LAB_IP_ALLOWLIST, LAB_IP_ENFORCED } = require('../config/production');
const { ipInList } = require('../utils/clientIp');
const activityLog = require('../models/activityLog.model');

function requireClinicIP(req, res, next) {
  if (!LAB_IP_ENFORCED) return next();
  const ip = req.clientIp;
  if (ip && ipInList(ip, LAB_IP_ALLOWLIST)) return next();
  activityLog.log({
    role: req.user?.role || 'anonymous',
    username: req.user?.username || 'anonymous',
    name: req.user?.name,
    action: 'lab:ip-blocked',
    detail: (req.method + ' ' + req.originalUrl),
    ip: ip || 'unknown',
    sessionId: req.user?.jti
  }).catch(() => {});
  return res.status(403).json({ ok: false, error: 'Lab Studio is only reachable from an approved clinic network.' });
}

module.exports = { requireClinicIP };
