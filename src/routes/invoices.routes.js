const express = require('express');
const invoices = require('../controllers/invoices.controller');

const router = express.Router();
router.post('/invoices/:id/pay', invoices.pay);

module.exports = router;
