const express = require('express');
const shop = require('../controllers/shop.controller');
const { idempotent } = require('../middleware/idempotency');
const { requireAnyRole } = require('../middleware/auth');

const router = express.Router();
// Placing an order needs a real account (a dentist/clinic, or admin on
// their behalf) — there is no payment step, so an order is a promise to
// pay on pickup and has to be attached to someone the lab can invoice.
// In demo mode requireAnyRole resolves a synthetic session, so the
// walkthrough still works end to end.
router.post('/checkout', requireAnyRole(['dentist', 'admin']), idempotent('shop:checkout'), shop.checkout);

module.exports = router;
