const express = require('express');
const adminActivity = require('../controllers/adminActivity.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/admin/activity', requireRole('admin'), adminActivity.list);

module.exports = router;
