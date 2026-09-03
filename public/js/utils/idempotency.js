// One fresh key per user-initiated attempt at a mutating action (case
// create, case action, invoice pay, checkout) — sent as the
// Idempotency-Key header so a dropped connection followed by the browser
// or the person retrying the exact same click can't double-advance a
// case, double-charge an invoice, or double-place an order. See
// src/middleware/idempotency.js for the server side.
export function newIdempotencyKey() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  // Old-browser fallback — still unique enough for this purpose (dedupe
  // within a 24h window, not a security token).
  return 'idk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
