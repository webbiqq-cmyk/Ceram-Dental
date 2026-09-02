const express = require('express');
const expenses = require('../controllers/expenses.controller');

const router = express.Router();
router.post('/expenses', expenses.create);

module.exports = router;
