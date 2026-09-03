const express = require('express');
const uploads = require('../controllers/uploads.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/admin/uploads/status', requireRole('admin'), uploads.status);
router.post('/admin/uploads/sign', requireRole('admin'), uploads.sign);

module.exports = router;
