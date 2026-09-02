const express = require('express');
const state = require('../controllers/state.controller');

const router = express.Router();
router.get('/state', state.getState);

module.exports = router;
