// Enquiries had no way in from the UI at all before this — only ever
// seeded, never created. Staff logging a lead that arrived somewhere this
// app can't see (an Instagram DM, a phone call) needs a real endpoint.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

async function adminCookie(baseUrl) {
  const { username, password } = await makeTestUser('admin');
  const res = await fetch(baseUrl + '/api/auth/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return /admin_session=[^;]+/.exec(res.headers.get('set-cookie'))[0];
}

test('logging an enquiry', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);
  const cookie = await adminCookie(baseUrl);

  await t.test('requires admin — anonymous is rejected', async () => {
    const res = await fetch(baseUrl + '/api/enquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' })
    });
    assert.equal(res.status, 401);
  });

  await t.test('requires a name', async () => {
    const res = await fetch(baseUrl + '/api/enquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ channel: 'WhatsApp' })
    });
    assert.equal(res.status, 400);
  });

  await t.test('creates an enquiry at the "new" stage', async () => {
    const res = await fetch(baseUrl + '/api/enquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Test Lead', handle: '@testlead', channel: 'Instagram DM', service: 'veneers', message: 'Asked about pricing.' })
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.enquiry.stage, 'new');
    assert.equal(json.enquiry.name, 'Test Lead');
  });

  await t.test('a logged enquiry can then move through the stage pipeline', async () => {
    const created = await fetch(baseUrl + '/api/enquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Pipeline Lead', channel: 'WhatsApp' })
    }).then(r => r.json());
    const advanced = await fetch(baseUrl + '/api/enquiries/' + created.enquiry.id + '/stage', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ stage: 'contacted' })
    }).then(r => r.json());
    assert.equal(advanced.enquiry.stage, 'contacted');
  });
});
