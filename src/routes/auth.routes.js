const express = require('express');
const auth = require('../controllers/auth.controller');
const { requireRoleParam } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/security');

const router = express.Router();

router.post('/auth/:role/login', loginLimiter, auth.login);
router.post('/auth/:role/logout', auth.logout);
router.get('/auth/:role/me', requireRoleParam, auth.me);
router.post('/auth/:role/change-password', requireRoleParam, auth.changePassword);
router.get('/auth/:role/sessions', requireRoleParam, auth.mySessions);

module.exports = router;
