const express = require('express');
const invoices = require('../controllers/invoices.controller');
const { requireRole } = require('../middleware/auth');
const { idempotent } = require('../middleware/idempotency');

const router = express.Router();
router.post('/invoices/:id/pay', requireRole('admin'), idempotent('invoices:pay'), invoices.pay);

module.exports = router;
