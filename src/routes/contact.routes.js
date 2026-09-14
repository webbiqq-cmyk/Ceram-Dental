const express = require('express');
const contact = require('../controllers/contact.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/contact', contact.send);
router.post('/messages/:id/read', requireRole('admin'), contact.markRead);
router.post('/messages/:id/delete', requireRole('admin'), contact.remove);

module.exports = router;
