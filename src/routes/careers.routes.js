const express = require('express');
const careers = require('../controllers/careers.controller');

const router = express.Router();
router.post('/careers/apply', careers.apply);

module.exports = router;
