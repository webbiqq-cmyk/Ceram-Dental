// Express app wiring — no listen() here (see ../server.js), so this file can
// be required both by the real server and by tests/serverless entry points.
const express = require('express');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', apiRoutes);

module.exports = app;
