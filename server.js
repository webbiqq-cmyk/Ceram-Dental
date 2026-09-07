// Ceram Dental — demo platform server
//
// Entry point only: the actual app (routes/controllers/models — see src/) is
// built in src/app.js. This file just starts it listening.
//
// Vercel imports this file as a serverless function (module.exports = app)
// instead of running it directly, so we only call .listen() when the file
// is executed directly with `node server.js`.

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  const server = app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
    console.log(`Ceram Dental demo running → http://localhost:${PORT}`);
  });

  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.keepAliveTimeout = 5000;

  // Graceful shutdown for any always-on host (a VM, Render, Docker, systemd
  // — anything that sends SIGTERM before killing the process). Finishes
  // in-flight requests instead of dropping them mid-response, then exits.
  // Doesn't apply to Vercel: each serverless invocation is already its own
  // short-lived process with no equivalent shutdown signal to catch.
  function shutdown(signal) {
    console.log(`[shutdown] ${signal} received, closing server…`);
    server.close(async () => {
      await require('./src/db/pool').pool?.end();
      process.exit(0);
    });
    // Don't hang forever if a connection never closes on its own.
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
