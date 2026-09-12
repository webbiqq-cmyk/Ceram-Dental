// The lab manager doesn't hold separate reception/designer/technician/qc
// credentials — signed in as 'lab' is meant to be enough to open and act
// on any station, same as the "Earlier case pipeline" board already
// treats 'lab' as seeing everything. Every station dashboard hardcodes
// its own asRole hint (e.g. reception.js always sends 'receptionist') —
// this locks in that a manager's real 'lab' session isn't excluded by
// that hint on either reads (requireWorkflowRole) or actions
// (requireAnyRole), while a genuinely unauthenticated request still 401s.
process.env.REQUIRE_LOGIN = 'true';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

function cookieOf(res) { return res.headers.get('set-cookie').split(';')[0]; }

test('lab manager full access', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);

  const dentist = await makeTestUser('dentist');
  const dLogin = await fetch(baseUrl + '/api/auth/dentist/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:dentist.username, password:dentist.password}) });
  const dCookie = cookieOf(dLogin);
  const created = await (await fetch(baseUrl + '/api/orders', { method:'POST', headers:{'Content-Type':'application/json', Cookie: dCookie}, body: JSON.stringify({patientRef:'Manager Test', jobType:'crowns', deliveryMethod:'pickup'}) })).json();
  const orderId = created.order.id;

  const lab = await makeTestUser('lab');
  const lLogin = await fetch(baseUrl + '/api/auth/lab/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:lab.username, password:lab.password}) });
  const lCookie = cookieOf(lLogin);

  await t.test('manager can read the reception queue without a receptionist cookie', async () => {
    const res = await fetch(baseUrl + '/api/orders?asRole=receptionist', { headers: { Cookie: lCookie } });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.orders.some(o => o.id === orderId));
  });

  const designer = await makeTestUser('designer');
  await t.test('manager can perform reception-review (a receptionist-only action) without receptionist creds', async () => {
    const res = await fetch(baseUrl + '/api/orders/' + orderId + '/reception-review?asRole=receptionist', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: lCookie },
      body: JSON.stringify({ decision: 'accept', paymentChecked: true, detailsChecked: true, designerId: designer.user.id })
    });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.order.status, 'in_design');
  });

  await t.test('a random unauthenticated request still 401s (no accidental full bypass)', async () => {
    const res = await fetch(baseUrl + '/api/orders/' + orderId + '/reception-review?asRole=receptionist', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
    assert.equal(res.status, 401);
  });
});
