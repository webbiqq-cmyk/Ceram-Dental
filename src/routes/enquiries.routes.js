const express = require('express');
const enquiries = require('../controllers/enquiries.controller');

const router = express.Router();
router.post('/enquiries/:id/stage', enquiries.setStage);

module.exports = router;
