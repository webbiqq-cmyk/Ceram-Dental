const express = require('express');
const products = require('../controllers/products.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/products', requireRole('admin'), products.create);
router.post('/products/:id', requireRole('admin'), products.update);
router.post('/products/:id/delete', requireRole('admin'), products.remove);

module.exports = router;
