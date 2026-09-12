// Production ships with zero admin rows (see migrations 001/005 — nothing
// seeds one), so the admin sign-in screen has to double as first-run setup:
// whatever is typed there becomes the real admin account, exactly once.
// This is the one scenario the rest of the auth suite can't exercise,
// since its in-memory seed always has active admin accounts already.
process.env.REQUIRE_LOGIN = 'true';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('./helpers/testApp');
const userModel = require('../src/models/user.model');

test('admin bootstrap', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);
  // Simulate a fresh production database: no active admin account yet.
  userModel.users.forEach(u => { if (u.role === 'admin') u.active = false; });

  await t.test('first sign-in with no admin account creates it', async () => {
    const res = await fetch(baseUrl + '/api/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bootstrap-admin', password: 'FirstRunPassword1' })
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.bootstrap, true);
    assert.equal(json.user.username, 'bootstrap-admin');
    assert.ok(res.headers.get('set-cookie')?.includes('admin_session='));
  });

  await t.test('a short password is rejected instead of creating a weak admin account', async () => {
    userModel.users.forEach(u => { if (u.role === 'admin') u.active = false; });
    const res = await fetch(baseUrl + '/api/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'weak-admin', password: 'short' })
    });
    assert.equal(res.status, 400);
    assert.equal(await userModel.hasActiveUser('admin'), false);
  });

  await t.test('bootstrap never fires twice — the next attempt is a real, checked login', async () => {
    userModel.users.forEach(u => { if (u.role === 'admin') u.active = false; });
    await fetch(baseUrl + '/api/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'real-admin', password: 'RealAdminPassword1' })
    });
    // Someone else trying arbitrary "new" credentials now gets a normal
    // rejection, not a second bootstrap that would hijack the account.
    const res = await fetch(baseUrl + '/api/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'someone-else', password: 'WhateverPassword1' })
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.bootstrap, undefined);
    // The real admin's own credentials still work as an ordinary login.
    const realLogin = await fetch(baseUrl + '/api/auth/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'real-admin', password: 'RealAdminPassword1' })
    });
    assert.equal(realLogin.status, 200);
    assert.equal((await realLogin.json()).bootstrap, undefined);
  });
});
