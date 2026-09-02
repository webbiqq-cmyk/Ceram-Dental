const express = require('express');
const appointments = require('../controllers/appointments.controller');

const router = express.Router();
router.post('/appointments', appointments.create);
router.post('/appointments/:id/status', appointments.setStatus);

module.exports = router;
