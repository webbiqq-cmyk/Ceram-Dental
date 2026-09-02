const express = require('express');
const contact = require('../controllers/contact.controller');

const router = express.Router();
router.post('/contact', contact.send);

module.exports = router;
