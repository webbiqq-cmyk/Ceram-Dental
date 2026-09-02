const express = require('express');
const shop = require('../controllers/shop.controller');

const router = express.Router();
router.post('/checkout', shop.checkout);

module.exports = router;
