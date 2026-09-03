const express = require('express');
const settings = require('../controllers/settings.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/settings', requireRole('admin'), settings.update);

module.exports = router;
