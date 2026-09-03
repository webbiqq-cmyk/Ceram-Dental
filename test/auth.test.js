// Locks in the auth guarantees this project was built around: three
// genuinely separate logins, real session revocation, and a token that
// can't be forged or replayed across roles. Every assertion here mirrors
// something already proven by hand during hardening — this is what keeps
// it proven on every future change.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

function cookieValue(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const c of list) {
    const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    if (m) return m[1];
  }
  return null;
}

test('auth', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);

  await t.test('wrong password is rejected', async () => {
    const { username } = await makeTestUser('dentist');
    const res = await fetch(baseUrl + '/api/auth/dentist/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'definitely-wrong' })
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.ok, false);
  });

  await t.test('correct login on one role grants nothing on the others', async () => {
    const { username, password } = await makeTestUser('dentist');
    const loginRes = await fetch(baseUrl + '/api/auth/dentist/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    assert.equal(loginRes.status, 200);
    const cookie = cookieValue(loginRes.headers.get('set-cookie'), 'dentist_session');
    assert.ok(cookie, 'expected a dentist_session cookie to be set');

    // The same cookie value, presented under the admin cookie name, must
    // not grant admin access — the token's own role claim is checked
    // against the cookie it arrived in, not just "is this signature valid".
    const stateRes = await fetch(baseUrl + '/api/state', { headers: { Cookie: 'admin_session=' + cookie } });
    const state = await stateRes.json();
    assert.equal(state.auth.admin, false);
    assert.equal(state.auth.dentist, false, 'a dentist token under the admin cookie name must not even authenticate as dentist');
  });

  await t.test('a forged token (wrong secret) is rejected', async () => {
    const forged = jwt.sign({ sub: 'x', username: 'admin', role: 'admin', name: 'Forged', jti: 'fake' }, 'wrong-secret', { expiresIn: '1h' });
    const res = await fetch(baseUrl + '/api/state', { headers: { Cookie: 'admin_session=' + forged } });
    const json = await res.json();
    assert.equal(json.auth.admin, false);
  });

  await t.test('a genuinely tampered payload (old signature, changed claims) is rejected', async () => {
    const { username, password } = await makeTestUser('lab');
    const loginRes = await fetch(baseUrl + '/api/auth/lab/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const cookie = cookieValue(loginRes.headers.get('set-cookie'), 'lab_session');
    const [h, p, s] = cookie.split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    payload.username = 'someone-else';
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const forged = h + '.' + tamperedPayload + '.' + s;

    const res = await fetch(baseUrl + '/api/state', { headers: { Cookie: 'lab_session=' + forged } });
    const json = await res.json();
    assert.equal(json.auth.lab, false);
  });

  await t.test('logout revokes the session — the same cookie stops working immediately', async () => {
    const { username, password } = await makeTestUser('admin');
    const loginRes = await fetch(baseUrl + '/api/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const cookie = cookieValue(loginRes.headers.get('set-cookie'), 'admin_session');

    const before = await fetch(baseUrl + '/api/state', { headers: { Cookie: 'admin_session=' + cookie } }).then(r => r.json());
    assert.equal(before.auth.admin, true);

    await fetch(baseUrl + '/api/auth/admin/logout', { method: 'POST', headers: { Cookie: 'admin_session=' + cookie } });

    const after = await fetch(baseUrl + '/api/state', { headers: { Cookie: 'admin_session=' + cookie } }).then(r => r.json());
    assert.equal(after.auth.admin, false, 'a logged-out session must not still authenticate');
  });

  await t.test('remember-me issues a longer-lived cookie than a normal login', async () => {
    const { username, password } = await makeTestUser('dentist');
    const normal = await fetch(baseUrl + '/api/auth/dentist/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const normalMaxAge = /Max-Age=(\d+)/.exec(normal.headers.get('set-cookie'))[1];

    const { username: u2, password: p2 } = await makeTestUser('dentist');
    const remembered = await fetch(baseUrl + '/api/auth/dentist/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u2, password: p2, remember: true })
    });
    const rememberedMaxAge = /Max-Age=(\d+)/.exec(remembered.headers.get('set-cookie'))[1];

    assert.ok(Number(rememberedMaxAge) > Number(normalMaxAge), 'remember-me session should outlive a normal one');
  });
});
