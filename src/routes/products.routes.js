const express = require('express');
const products = require('../controllers/products.controller');

const router = express.Router();
router.post('/products', products.create);
router.post('/products/:id', products.update);
router.post('/products/:id/delete', products.remove);

module.exports = router;
