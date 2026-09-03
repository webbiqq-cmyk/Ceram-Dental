const express = require('express');
const adminUsers = require('../controllers/adminUsers.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/admin/users', requireRole('admin'), adminUsers.list);
router.post('/admin/users', requireRole('admin'), adminUsers.create);
router.post('/admin/users/:id', requireRole('admin'), adminUsers.update);
router.post('/admin/users/:id/reset-password', requireRole('admin'), adminUsers.resetPassword);
router.post('/admin/users/:id/delete', requireRole('admin'), adminUsers.remove);

module.exports = router;
