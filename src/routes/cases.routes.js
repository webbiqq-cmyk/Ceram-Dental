const express = require('express');
const cases = require('../controllers/cases.controller');

const router = express.Router();
router.post('/cases', cases.create);
router.post('/cases/:id/action', cases.act);

module.exports = router;
