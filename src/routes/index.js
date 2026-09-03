// Aggregates every resource router under one mount point (/api, wired in
// src/app.js) — one file per resource so a route is always one grep away.
const express = require('express');

const router = express.Router();

router.use(require('./auth.routes'));
router.use(require('./state.routes'));
router.use(require('./cases.routes'));
router.use(require('./invoices.routes'));
router.use(require('./expenses.routes'));
router.use(require('./shop.routes'));
router.use(require('./products.routes'));
router.use(require('./careers.routes'));
router.use(require('./contact.routes'));
router.use(require('./appointments.routes'));
router.use(require('./enquiries.routes'));
router.use(require('./team.routes'));
router.use(require('./settings.routes'));

module.exports = router;
