const express = require('express');
const { requireWorkflowRole } = require('../middleware/workflowRole');
const { asyncHandler } = require('../utils/asyncHandler');
const { search } = require('../services/search.service');

const router = express.Router();

// Scope comes from the authenticated role, never from the query string.
router.get('/search', requireWorkflowRole(['dentist', 'receptionist', 'designer', 'technician', 'qc', 'lab', 'admin']),
  asyncHandler(async (req, res) => {
    res.json(Object.assign({ ok: true }, await search(req.user.role, req.user.sub, req.query.q)));
  }));

module.exports = router;
