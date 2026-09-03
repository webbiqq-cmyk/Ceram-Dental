const express = require('express');
const invoices = require('../controllers/invoices.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/invoices/:id/pay', requireRole('admin'), invoices.pay);

module.exports = router;
