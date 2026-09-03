const express = require('express');
const exportCtrl = require('../controllers/export.controller');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const admin = requireRole('admin');

router.get('/admin/export/invoices.xlsx', admin, exportCtrl.invoices);
router.get('/admin/export/expenses.xlsx', admin, exportCtrl.expenses);
router.get('/admin/export/appointments.xlsx', admin, exportCtrl.appointments);
router.get('/admin/export/cases.xlsx', admin, exportCtrl.cases);
router.get('/admin/export/orders.xlsx', admin, exportCtrl.orders);
router.get('/admin/export/report.docx', admin, exportCtrl.report);

module.exports = router;
