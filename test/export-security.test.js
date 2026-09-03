// Regression test for the exact crash found under master-level stress
// testing: a crafted date-range query string on an export endpoint flowed
// unsanitized into a Content-Disposition header, and Node's http module
// throwing on an invalid header character — inside an unguarded async
// handler — took the whole process down. If this ever comes back, this
// test fails loudly instead of the server dying silently in production.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

async function adminCookie(baseUrl) {
  const { username, password } = await makeTestUser('admin');
  const res = await fetch(baseUrl + '/api/auth/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const match = /admin_session=[^;]+/.exec(res.headers.get('set-cookie'));
  return match[0];
}

test('export endpoint input handling', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);
  const cookie = await adminCookie(baseUrl);

  const adversarial = [
    ['CRLF header injection attempt', '%0d%0aX-Injected:%20pwned'],
    ['quote injection', '%22evil%22'],
    ['garbage date', 'not-a-date'],
    ['null bytes', '%00%00'],
    ['array param', encodeURIComponent('a') + '&from=' + encodeURIComponent('b')]
  ];

  for (const [label, from] of adversarial) {
    await t.test(label + ' returns a clean response, not a crash', async () => {
      const res = await fetch(baseUrl + '/api/admin/export/invoices.xlsx?from=' + from, { headers: { Cookie: cookie } });
      assert.equal(res.status, 200, 'a malformed date param should fall back to the default range, never fail the request');
      await res.arrayBuffer(); // drain — also proves the body is well-formed
    });
  }

  await t.test('the server is still alive and serving normal requests after all of the above', async () => {
    const res = await fetch(baseUrl + '/api/state');
    assert.equal(res.status, 200);
  });

  await t.test('a valid date range still produces a real file', async () => {
    const res = await fetch(baseUrl + '/api/admin/export/invoices.xlsx?from=2020-01-01&to=2030-01-01', { headers: { Cookie: cookie } });
    assert.equal(res.status, 200);
    const buf = await res.arrayBuffer();
    assert.ok(buf.byteLength > 0, 'expected a non-empty xlsx file');
  });
});
