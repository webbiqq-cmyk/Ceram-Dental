const express = require('express');
const expenses = require('../controllers/expenses.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/expenses', requireRole('admin'), expenses.create);

module.exports = router;
