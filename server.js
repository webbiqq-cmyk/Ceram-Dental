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
  app.listen(PORT, () => {
    console.log(`Ceram Dental demo running → http://localhost:${PORT}`);
  });
}

module.exports = app;
