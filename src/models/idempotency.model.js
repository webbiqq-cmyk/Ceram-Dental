// Tracks Idempotency-Key headers on mutating requests. In-memory, same
// spirit as session.model.js: a Map keyed by scope, pruned by age rather
// than kept forever — an idempotency key only needs to matter for as long
// as a client might plausibly retry the same request (hours, not months).
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24h — the usual idempotency-key convention

const store = new Map(); // scopeKey -> { status: 'pending' | 'done', statusCode, body, at }

function prune() {
  const cutoff = Date.now() - RETENTION_MS;
  for (const [k, v] of store) {
    if (v.at < cutoff) store.delete(k);
  }
}

// Scoped per route + caller + key, so one dentist's key can never collide
// with another's, or with the same key reused on a different endpoint.
function scopeKey(routeTag, callerId, idempotencyKey) {
  return routeTag + '::' + callerId + '::' + idempotencyKey;
}

// Returns the existing record if this exact (route, caller, key) has been
// seen before; otherwise marks it "pending" and returns null, so the
// caller knows it's the one running the real handler.
function begin(routeTag, callerId, idempotencyKey) {
  prune();
  const key = scopeKey(routeTag, callerId, idempotencyKey);
  const existing = store.get(key);
  if (existing) return { key, existing };
  store.set(key, { status: 'pending', at: Date.now() });
  return { key, existing: null };
}

function complete(key, statusCode, body) {
  store.set(key, { status: 'done', statusCode, body, at: Date.now() });
}

// Drops the key entirely rather than caching a failure — an idempotency
// key should dedupe a repeated *success*, not permanently poison a retry
// after a transient error (a real fix, or just a flaky connection).
function abandon(key) {
  store.delete(key);
}

module.exports = { begin, complete, abandon };
