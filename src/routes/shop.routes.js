const express = require('express');
const shop = require('../controllers/shop.controller');
const { idempotent } = require('../middleware/idempotency');

const router = express.Router();
router.post('/checkout', idempotent('shop:checkout'), shop.checkout);

module.exports = router;
