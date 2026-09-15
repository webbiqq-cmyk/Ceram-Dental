const express = require('express');
const notifications = require('../controllers/notifications.controller');
const { requireWorkflowRole } = require('../middleware/workflowRole');

const router = express.Router();
// Every station gets a bell, not just admin/dentist/lab. The workflow now
// notifies reception, design, production and QC directly (see
// workflow.service.js) — telling a designer their case was returned for
// changes is worthless if the designer's own role can't read the message.
//
// requireWorkflowRole, not requireAnyRole: someone may legitimately hold
// two sessions at once (a lab manager who is also signed into the dentist
// portal), and first-match-wins would then hand them the wrong queue's
// notifications. The workspace says which role it is reading as, and the
// real session check for that role still runs.
const anyRole = requireWorkflowRole(['admin', 'dentist', 'lab', 'receptionist', 'designer', 'technician', 'qc']);

router.get('/notifications', anyRole, notifications.list);
router.post('/notifications/:id/read', anyRole, notifications.markRead);
router.post('/notifications/read-all', anyRole, notifications.markAllRead);

module.exports = router;
