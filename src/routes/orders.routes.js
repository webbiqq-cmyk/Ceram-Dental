const express = require('express');
const orders = require('../controllers/orders.controller');
const uploads = require('../controllers/uploads.controller');
const { requireAnyRole } = require('../middleware/auth');
const { requireWorkflowRole } = require('../middleware/workflowRole');
const { requireClinicIP } = require('../middleware/clinicIp');
const { idempotent } = require('../middleware/idempotency');

const router = express.Router();

const ALL_WORKFLOW_ROLES = ['dentist', 'receptionist', 'designer', 'technician', 'qc', 'admin', 'lab'];

// Doctors create orders; every workflow role (plus admin/lab-manager
// oversight) can list/open one — which fields are visible per role is a
// UI concern, not an access-control one, matching how the existing case
// pipeline already treats "lab" as one role that sees everything. These
// shared routes use requireWorkflowRole, not requireAnyRole directly —
// see src/middleware/workflowRole.js for why that distinction matters
// while login stays disabled.
router.post('/orders', requireAnyRole(['dentist']), idempotent('orders:create'), orders.create);
router.get('/orders', requireWorkflowRole(ALL_WORKFLOW_ROLES), orders.list);
router.get('/orders/:id', requireWorkflowRole(ALL_WORKFLOW_ROLES), orders.detail);

// Lab Studio actions — auth + role + clinic-IP allowlist (requireClinicIP is
// a no-op until CLINIC_IP_ALLOWLIST is set). Dentist actions stay remote.
router.post('/orders/:id/reception-review', requireAnyRole(['receptionist']), requireClinicIP, idempotent('orders:reception-review'), orders.receptionReview);
router.post('/orders/:id/design-done', requireAnyRole(['designer']), requireClinicIP, idempotent('orders:design-done'), orders.designDone);
router.post('/orders/:id/production-done', requireAnyRole(['technician']), requireClinicIP, idempotent('orders:production-done'), orders.productionDone);
router.post('/orders/:id/qc-decision', requireAnyRole(['qc']), requireClinicIP, idempotent('orders:qc-decision'), orders.qcDecision);
router.post('/orders/:id/doctor-decision', requireAnyRole(['dentist']), idempotent('orders:doctor-decision'), orders.doctorDecision);
router.post('/orders/:id/confirm-completion', requireAnyRole(['receptionist']), requireClinicIP, idempotent('orders:confirm-completion'), orders.confirmCompletion);
router.post('/orders/:id/mark-delivered', requireAnyRole(['receptionist']), requireClinicIP, idempotent('orders:mark-delivered'), orders.markDelivered);
router.post('/orders/:id/mark-completed', requireAnyRole(['receptionist']), requireClinicIP, idempotent('orders:mark-completed'), orders.markCompleted);

router.get('/orders/:id/messages', requireWorkflowRole(ALL_WORKFLOW_ROLES), orders.listMessages);
router.post('/orders/:id/messages', requireWorkflowRole(ALL_WORKFLOW_ROLES), orders.postMessage);
router.get('/orders/:id/files', requireWorkflowRole(ALL_WORKFLOW_ROLES), orders.listFiles);
router.post('/orders/:id/files', requireWorkflowRole(ALL_WORKFLOW_ROLES), orders.recordFile);

// Assignment rosters — who reception/designers can hand an order to. Lab-only.
router.get('/staff', requireWorkflowRole(['receptionist', 'designer', 'technician', 'admin', 'lab']), requireClinicIP, orders.listStaff);

// Signed Cloudinary upload for case scans/photos/design files/QC photos —
// same controller as the admin-only product/team uploader
// (uploads.controller.js already branches on folder:'cases'), just
// reachable by whichever workflow role is actually attaching a file
// instead of gated to admin.
router.post('/orders/uploads/sign', requireWorkflowRole(ALL_WORKFLOW_ROLES), uploads.sign);

module.exports = router;
