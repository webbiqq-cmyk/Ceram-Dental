// Locks in the fix for a real bug found during hardening: the login
// limiter originally keyed on IP alone, so hammering (or just using) one
// portal's login could burn through the shared allowance for all three
// roles from the same office IP. It's now keyed on IP *and* role.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

async function attempt(baseUrl, role, username) {
  const res = await fetch(baseUrl + '/api/auth/' + role + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'wrong' })
  });
  return res.status;
}

test('login rate limiting', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);

  await t.test('caps at 8 attempts per 15 minutes, then 429s', async () => {
    const statuses = [];
    for (let i = 0; i < 10; i++) statuses.push(await attempt(baseUrl, 'admin', 'someone'));
    const wrongPassword = statuses.filter(s => s === 400).length;
    const limited = statuses.filter(s => s === 429).length;
    assert.equal(wrongPassword, 8, 'expected exactly 8 attempts to reach the handler');
    assert.equal(limited, 2, 'expected the remaining attempts to be rate-limited');
  });

  await t.test('a different role from the same IP is not affected by the exhausted bucket', async () => {
    // admin's bucket above is already exhausted; dentist and lab must be
    // completely independent buckets, not sharing the same IP-only key.
    const status = await attempt(baseUrl, 'dentist', 'someone');
    assert.equal(status, 400, 'a fresh role should still get a real credential check, not a 429 inherited from another role');
  });

  await t.test('a real login still succeeds through the general API limiter', async () => {
    const { username, password } = await makeTestUser('lab');
    const res = await fetch(baseUrl + '/api/auth/lab/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    assert.equal(res.status, 200);
  });
});
