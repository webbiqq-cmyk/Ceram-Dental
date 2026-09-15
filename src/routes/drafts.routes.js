const express = require('express');
const drafts = require('../controllers/drafts.controller');
const { requireAnyRole } = require('../middleware/auth');
const { idempotent } = require('../middleware/idempotency');

const router = express.Router();

// Dentist-only, with no lab route in at all. That is the security model
// for drafts in one line: the lab cannot see unsubmitted work because
// there is no endpoint through which it could ask.
const dentistOnly = requireAnyRole(['dentist']);

router.get('/drafts', dentistOnly, drafts.list);
router.post('/drafts', dentistOnly, idempotent('drafts:create'), drafts.create);
router.get('/drafts/:id', dentistOnly, drafts.detail);
// Autosave writes here, so it is deliberately not idempotency-keyed: each
// save is a full replacement of the same draft and re-sending one is
// harmless by construction.
router.put('/drafts/:id', dentistOnly, drafts.save);
router.delete('/drafts/:id', dentistOnly, drafts.remove);

// Duplicating reads an existing order and writes a draft — never a case.
router.post('/orders/:id/duplicate', dentistOnly, idempotent('drafts:duplicate'), drafts.duplicate);

module.exports = router;
