const express = require('express');
const cases = require('../controllers/cases.controller');
const { requireAnyRole } = require('../middleware/auth');

const router = express.Router();
// Submitting a new case is the public "Start a Case" referral form — stays
// open, same as /contact and /appointments. Acting on an existing case
// (advance, approve, reject, pickup...) is Dentist Portal / Lab Studio
// work — which specific actions each role may take is enforced inside the
// controller, since it depends on the action, not just the route.
router.post('/cases', cases.create);
router.post('/cases/:id/action', requireAnyRole(['dentist', 'lab']), cases.act);

module.exports = router;
