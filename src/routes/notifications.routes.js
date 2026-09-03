const express = require('express');
const notifications = require('../controllers/notifications.controller');
const { requireAnyRole } = require('../middleware/auth');

const router = express.Router();
const anyRole = requireAnyRole(['admin', 'dentist', 'lab']);

router.get('/notifications', anyRole, notifications.list);
router.post('/notifications/:id/read', anyRole, notifications.markRead);
router.post('/notifications/read-all', anyRole, notifications.markAllRead);

module.exports = router;
