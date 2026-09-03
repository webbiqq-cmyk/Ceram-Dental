// Express app wiring — no listen() here (see ../server.js), so this file can
// be required both by the real server and by tests/serverless entry points.
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { helmetMiddleware, apiLimiter } = require('./middleware/security');
const apiRoutes = require('./routes');

const app = express();

// Behind Vercel's (or any) reverse proxy, so req.secure / req.ip reflect the
// real client, not the proxy hop — needed for secure cookies and rate
// limiting to work correctly in production.
app.set('trust proxy', 1);

app.use(helmetMiddleware);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '100kb' })); // small, deliberate ceiling — nothing here legitimately sends more
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', apiLimiter, apiRoutes);

// Final error handler — anything that throws past this point (a bad JSON
// body, an unexpected exception in a controller) gets a generic message,
// never a stack trace or internal detail back to the client.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ ok: false, error: 'Something went wrong.' });
});

module.exports = app;
