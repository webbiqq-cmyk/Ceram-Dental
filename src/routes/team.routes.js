const express = require('express');
const team = require('../controllers/team.controller');

const router = express.Router();
router.post('/team', team.create);

module.exports = router;
