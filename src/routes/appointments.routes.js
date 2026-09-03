const express = require('express');
const appointments = require('../controllers/appointments.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
// Creating a booking request is the public "Book a consultation" form —
// stays open. Only changing its status is an admin action.
router.post('/appointments', appointments.create);
router.post('/appointments/:id/status', requireRole('admin'), appointments.setStatus);

module.exports = router;
