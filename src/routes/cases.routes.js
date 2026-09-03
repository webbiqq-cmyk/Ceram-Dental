const express = require('express');
const cases = require('../controllers/cases.controller');
const { requireAnyRole } = require('../middleware/auth');
const { idempotent } = require('../middleware/idempotency');

const router = express.Router();
// Submitting a new case is the public "Start a Case" referral form — stays
// open, same as /contact and /appointments. Acting on an existing case
// (advance, approve, reject, pickup...) is Dentist Portal / Lab Studio
// work — which specific actions each role may take is enforced inside the
// controller, since it depends on the action, not just the route.
//
// Both are idempotency-key aware: a dropped connection right as a case is
// submitted, or right as a lab tech clicks an action, shouldn't be able to
// create the case twice or double-advance the pipeline on retry.
router.post('/cases', idempotent('cases:create'), cases.create);
router.post('/cases/:id/action', requireAnyRole(['dentist', 'lab']), idempotent('cases:action'), cases.act);

module.exports = router;
