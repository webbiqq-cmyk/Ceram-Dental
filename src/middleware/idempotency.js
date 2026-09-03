// Opt-in idempotency for mutating endpoints. A client sends an
// `Idempotency-Key` header (any unique string it generates per user
// action — a UUID made once when the button is clicked, reused on every
// retry of that same click) and a retried request with the same key
// replays the original response instead of re-running the handler.
// Without the header, a request behaves exactly as it did before this
// existed — nothing forces a client to opt in.
//
// This exists for the cases where "the network drops right as a lab tech
// clicks Advance Case, and their client retries" would otherwise mean
// either a skipped/duplicated pipeline stage or, worse, an order or
// payment recorded twice.
//
// Two requests carrying the same key arriving concurrently (a genuine
// double-click, not just a retry) don't both run the handler — the second
// gets a 409 telling it a request with this key is already in flight,
// rather than racing the model layer.
const idempotency = require('../models/idempotency.model');

function idempotent(routeTag) {
  return (req, res, next) => {
    const key = req.header('Idempotency-Key');
    if (!key) return next();

    const callerId = (req.user && (req.user.role + ':' + req.user.username)) || req.ip;
    const { key: scopeKey, existing } = idempotency.begin(routeTag, callerId, key);

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({ ok: false, error: 'A request with this Idempotency-Key is already being processed.' });
      }
      return res.status(existing.statusCode).json(existing.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only a successful outcome is worth deduping against — a failed
      // attempt (validation error, unknown record, transient bug) should
      // let a genuine retry try again cleanly, not get stuck replaying
      // the same failure forever.
      if (res.statusCode >= 200 && res.statusCode < 400) idempotency.complete(scopeKey, res.statusCode, body);
      else idempotency.abandon(scopeKey);
      return originalJson(body);
    };
    res.on('close', () => {
      // The handler never actually responded (a crash, or the connection
      // dropping mid-request) — don't leave this key stuck "pending"
      // forever; free it for a clean retry instead of a permanent 409.
      if (!res.writableEnded) idempotency.abandon(scopeKey);
    });

    next();
  };
}

module.exports = { idempotent };
