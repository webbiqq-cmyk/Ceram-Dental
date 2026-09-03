// Ceram Dental — demo platform server
//
// Entry point only: the actual app (routes/controllers/models — see src/) is
// built in src/app.js. This file just starts it listening.
//
// Vercel imports this file as a serverless function (module.exports = app)
// instead of running it directly, so we only call .listen() when the file
// is executed directly with `node server.js`.

const app = require('./src/app');

// Last-resort safety net. Every known async route handler is wrapped in
// asyncHandler (src/utils/asyncHandler.js), which turns a thrown/rejected
// error into a normal 500 response for that one request — that's the real
// fix. These two listeners only catch something that slips past that (a
// bug outside the request lifecycle, a future handler someone forgets to
// wrap): log it loudly instead of letting Node's default behavior kill the
// whole process over one bad request and take every other user down with
// it. In a serverless deployment (Vercel) each request already runs in its
// own isolated invocation, so this mainly matters for `node server.js`
// and any other always-on host.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Ceram Dental demo running → http://localhost:${PORT}`);
  });

  // Graceful shutdown for any always-on host (a VM, Render, Docker, systemd
  // — anything that sends SIGTERM before killing the process). Finishes
  // in-flight requests instead of dropping them mid-response, then exits.
  // Doesn't apply to Vercel: each serverless invocation is already its own
  // short-lived process with no equivalent shutdown signal to catch.
  function shutdown(signal) {
    console.log(`[shutdown] ${signal} received, closing server…`);
    server.close(() => {
      console.log('[shutdown] closed cleanly.');
      process.exit(0);
    });
    // Don't hang forever if a connection never closes on its own.
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
