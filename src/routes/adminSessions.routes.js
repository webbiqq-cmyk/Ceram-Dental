const express = require('express');
const adminSessions = require('../controllers/adminSessions.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/admin/sessions', requireRole('admin'), adminSessions.list);
router.post('/admin/sessions/:jti/revoke', requireRole('admin'), adminSessions.revoke);

module.exports = router;
