// Shared test bootstrap. `node --test` runs each test file in its own
// process, so each file gets a fresh require of src/app.js (and every
// model's in-memory state) — no cross-file leakage, no shared server.
//
// Tests never touch the real seeded demo credentials (admin/dentist/lab) —
// those are handed to the client separately and never committed, on
// purpose (see README). Instead each test creates its own throwaway
// account with a known password via the same model/service layer the app
// itself uses, so the suite never needs to know or hardcode a real secret.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-' + Math.random().toString(36).slice(2);

const app = require('../../src/app');
const userModel = require('../../src/models/user.model');
const authService = require('../../src/services/auth.service');

function startTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: 'http://127.0.0.1:' + port, close: () => new Promise(r => server.close(r)) });
    });
  });
}

// Creates a fresh login for a test, with a unique username so it can never
// collide with the app's own seeded accounts or another test's fixture.
async function makeTestUser(role, opts) {
  const username = 'test-' + role + '-' + Math.random().toString(36).slice(2, 9);
  const password = 'TestPassword12345';
  const passwordHash = await authService.hashPassword(password);
  const user = userModel.createUser(Object.assign({ username, passwordHash, role, name: 'Test ' + role }, opts));
  return { user, username, password };
}

module.exports = { startTestServer, makeTestUser };
