const express = require('express');
const team = require('../controllers/team.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/team', requireRole('admin'), team.create);
router.patch('/team/:id', requireRole('admin'), team.update);
router.delete('/team/:id', requireRole('admin'), team.remove);

module.exports = router;
