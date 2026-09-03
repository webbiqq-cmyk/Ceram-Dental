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
  app.listen(PORT, () => {
    console.log(`Ceram Dental demo running → http://localhost:${PORT}`);
  });
}

module.exports = app;
