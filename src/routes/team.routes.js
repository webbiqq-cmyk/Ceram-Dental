const express = require('express');
const team = require('../controllers/team.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/team', requireRole('admin'), team.create);

module.exports = router;
