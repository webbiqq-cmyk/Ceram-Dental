const express = require('express');
const enquiries = require('../controllers/enquiries.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/enquiries/:id/stage', requireRole('admin'), enquiries.setStage);

module.exports = router;
