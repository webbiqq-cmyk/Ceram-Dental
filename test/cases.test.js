// Locks in the case-pipeline permission model: which actions each portal
// can take, matching what each UI actually exposes as buttons (see
// src/controllers/cases.controller.js's ACTIONS_BY_ROLE).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

async function loginCookie(baseUrl, role, username, password) {
  const res = await fetch(baseUrl + '/api/auth/' + role + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const match = new RegExp(role + '_session=[^;]+').exec(res.headers.get('set-cookie'));
  return match[0];
}

async function createCase(baseUrl) {
  const res = await fetch(baseUrl + '/api/cases', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinic: 'Perm Test Clinic', patient: 'P', service: 'crowns', shade: 'A2' })
  }).then(r => r.json());
  return res.case.id;
}

test('case creation', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);

  await t.test('is public — no login required', async () => {
    const res = await fetch(baseUrl + '/api/cases', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic: 'Walk-in', patient: 'X', service: 'veneers', shade: 'A1' })
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.case.stage, 'reception');
  });

  await t.test('rejects a case with no service', async () => {
    const res = await fetch(baseUrl + '/api/cases', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic: 'X' })
    });
    assert.equal(res.status, 400);
  });
});

test('case action permissions', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);
  const dentist = await makeTestUser('dentist');
  const lab = await makeTestUser('lab');
  const dentistCookie = await loginCookie(baseUrl, 'dentist', dentist.username, dentist.password);
  const labCookie = await loginCookie(baseUrl, 'lab', lab.username, lab.password);

  await t.test('anonymous cannot act on a case', async () => {
    const id = await createCase(baseUrl);
    const res = await fetch(baseUrl + '/api/cases/' + id + '/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ act: 'advance' })
    });
    assert.equal(res.status, 401);
  });

  await t.test('a dentist cannot take a lab-only action (advance)', async () => {
    const id = await createCase(baseUrl);
    const res = await fetch(baseUrl + '/api/cases/' + id + '/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: dentistCookie },
      body: JSON.stringify({ act: 'advance' })
    });
    assert.equal(res.status, 403);
  });

  await t.test('a lab account cannot take a dentist-only action (approve)', async () => {
    const id = await createCase(baseUrl);
    const res = await fetch(baseUrl + '/api/cases/' + id + '/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: labCookie },
      body: JSON.stringify({ act: 'approve' })
    });
    assert.equal(res.status, 403);
  });

  await t.test('lab CAN advance a case it owns', async () => {
    const id = await createCase(baseUrl);
    const res = await fetch(baseUrl + '/api/cases/' + id + '/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: labCookie },
      body: JSON.stringify({ act: 'advance' })
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.case.stage, 'qc', 'advance from reception should move to qc');
  });

  await t.test('an unknown action is rejected even for an authorized role', async () => {
    const id = await createCase(baseUrl);
    const res = await fetch(baseUrl + '/api/cases/' + id + '/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: labCookie },
      body: JSON.stringify({ act: 'teleport-to-ready' })
    });
    assert.equal(res.status, 403);
  });
});
