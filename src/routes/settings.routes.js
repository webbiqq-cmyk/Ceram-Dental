const express = require('express');
const settings = require('../controllers/settings.controller');

const router = express.Router();
router.post('/settings', settings.update);

module.exports = router;
