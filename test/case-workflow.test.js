// End-to-end cover for the case lifecycle as a person actually walks it,
// plus the guarantees the new derivation and visibility rules make.
//
// Every scenario runs against a real HTTP server with REQUIRE_LOGIN=true
// and one real account per role, so per-role authorisation is exercised
// rather than assumed — the demo's open-auth mode would let almost any of
// these pass without proving anything.
process.env.REQUIRE_LOGIN = 'true';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

function cookieOf(res) { return res.headers.get('set-cookie').split(';')[0]; }

async function signIn(baseUrl, role) {
  const account = await makeTestUser(role);
  const res = await fetch(baseUrl + '/api/auth/' + role + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: account.username, password: account.password })
  });
  assert.equal(res.status, 200, 'could not sign in as ' + role);
  return { id: account.user.id, cookie: cookieOf(res), name: account.user.name };
}

function client(baseUrl, actor) {
  return async function call(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: Object.assign({ Cookie: actor.cookie }, body === undefined ? {} : { 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  };
}

// One server and one set of accounts for the whole file. Each scenario
// still creates its own cases, so they stay independent of each other —
// but signing six roles in once instead of once per scenario keeps the
// file from spending its way through the login rate limiter, which is
// shared state when the suite runs against a real database.
let shared = null;
async function setUp() {
  if (shared) return shared;
  const { baseUrl, close } = await startTestServer();
  const [dentist, reception, designer, technician, qc, lab] = await Promise.all(
    ['dentist', 'receptionist', 'designer', 'technician', 'qc', 'lab'].map(role => signIn(baseUrl, role)));
  shared = {
    baseUrl, close,
    dentist, reception, designer, technician, qc, lab,
    asDentist: client(baseUrl, dentist), asReception: client(baseUrl, reception),
    asDesigner: client(baseUrl, designer), asTechnician: client(baseUrl, technician),
    asQc: client(baseUrl, qc), asLab: client(baseUrl, lab)
  };
  return shared;
}

test.after(async () => { if (shared) await shared.close(); });

async function createOrder(team, fields) {
  const { status, body } = await team.asDentist('POST', '/api/orders?asRole=dentist',
    Object.assign({ patientRef: 'PT-' + Math.random().toString(36).slice(2, 7), deliveryMethod: 'pickup' }, fields));
  assert.equal(status, 200, JSON.stringify(body));
  return body.order;
}

// Reads a case back as one role and returns its derived view — the object
// every screen renders from.
async function viewOf(call, id, role) {
  const { status, body } = await call('GET', '/api/orders/' + id + '?asRole=' + role);
  assert.equal(status, 200, JSON.stringify(body));
  return body.order.view;
}

test('Scenario A — a normal case walks the whole pipeline', async (t) => {
  const team = await setUp();
  const order = await createOrder(team, { jobType: 'crowns', shade: 'A2', instructions: 'Full crown on #16' });

  await t.test('starts with reception, and says so in plain language', async () => {
    const view = await viewOf(team.asReception, order.id, 'receptionist');
    assert.equal(view.stage, 'reception');
    assert.equal(view.owner_role, 'receptionist');
    assert.equal(view.headline, 'Waiting for reception review');
    assert.match(view.next_action, /accept or return/);
    // The clinic is told the same fact in its own words, never the status token.
    const dentistView = await viewOf(team.asDentist, order.id, 'dentist');
    assert.equal(dentistView.headline, 'With the lab for checking');
    assert.equal(dentistView.waiting_on, 'lab');
  });

  await t.test('reception accepts and assigns; the designer becomes the owner', async () => {
    const { status, body } = await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
      { decision: 'accept', paymentChecked: true, detailsChecked: true, designerId: team.designer.id });
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.order.status, 'in_design');
    assert.equal(body.order.view.owner_role, 'designer');
    assert.equal(body.order.view.owner_name, team.designer.name);
  });

  await t.test('design hands to production, production to QC, QC passes, reception closes out', async () => {
    let res = await team.asDesigner('POST', '/api/orders/' + order.id + '/design-done?asRole=designer', { technicianId: team.technician.id });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'in_production');
    assert.equal(res.body.order.view.stage, 'production');

    res = await team.asTechnician('POST', '/api/orders/' + order.id + '/production-done?asRole=technician', { qcId: team.qc.id });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'qc_pending');

    res = await team.asQc('POST', '/api/orders/' + order.id + '/qc-decision?asRole=qc', { decision: 'approve', packed: true, note: 'All checks passed.' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'qc_approved');
    assert.equal(res.body.order.view.owner_role, 'receptionist');

    res = await team.asReception('POST', '/api/orders/' + order.id + '/confirm-completion?asRole=receptionist', {});
    assert.equal(res.body.order.status, 'ready_for_pickup');
    res = await team.asReception('POST', '/api/orders/' + order.id + '/mark-delivered?asRole=receptionist', {});
    assert.equal(res.body.order.status, 'delivered');
    res = await team.asReception('POST', '/api/orders/' + order.id + '/mark-completed?asRole=receptionist', {});
    assert.equal(res.body.order.status, 'completed');

    const view = res.body.order.view;
    assert.equal(view.is_closed, true);
    assert.equal(view.next_action, '', 'a finished case must not invent a next action');
    assert.equal(view.waiting_on, null);
  });

  await t.test('the dentist was notified at each point that concerned them', async () => {
    const { body } = await team.asDentist('GET', '/api/notifications');
    const types = body.notifications.map(n => n.type);
    for (const expected of ['case-accepted', 'case-ready', 'case-completed']) {
      assert.ok(types.includes(expected), 'missing notification: ' + expected + ' (got ' + types.join(', ') + ')');
    }
  });
});

test('Scenario B — reception returns a case to the clinic with a structured reason', async (t) => {
  const team = await setUp();
  const order = await createOrder(team, { jobType: 'crowns' });

  await t.test('a return without a note is refused', async () => {
    const { status } = await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist', { decision: 'reject', reason: 'missing_information' });
    assert.equal(status, 400);
  });

  await t.test('the reason is recorded as structure, not buried in prose', async () => {
    const { status, body } = await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
      { decision: 'reject', reason: 'missing_information', note: 'No shade was selected.' });
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.order.status, 'rejected_by_reception');
    assert.match(body.order.rejection_note, /^Missing information: /);
  });

  await t.test('the case now reads as the clinic\'s move, on both sides', async () => {
    const dentistView = await viewOf(team.asDentist, order.id, 'dentist');
    assert.equal(dentistView.waiting_on, 'dentist');
    assert.equal(dentistView.owner_role, 'dentist');
    assert.match(dentistView.next_action, /Correct the details/);

    const labView = await viewOf(team.asReception, order.id, 'receptionist');
    assert.equal(labView.headline, 'Returned to the dentist');
    assert.ok(labView.flags.some(f => f.key === 'returned'));
  });
});

test('Scenario C & D — a veneer runs demo, revision, approval, then final production', async (t) => {
  const team = await setUp();
  const order = await createOrder(team, { jobType: 'veneers', shade: 'BL2' });

  assert.equal(order.stage_type, 'demo', 'veneers start in the demo stage');

  await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
    { decision: 'accept', paymentChecked: true, detailsChecked: true, designerId: team.designer.id });

  await t.test('the journey shows two labelled cycles, with the final one not started', async () => {
    const view = await viewOf(team.asDentist, order.id, 'dentist');
    assert.equal(view.journey.length, 2);
    assert.equal(view.journey[0].label, 'Demo cycle');
    assert.equal(view.journey[1].label, 'Final cycle');
    assert.ok(view.journey[1].steps.every(s => s.state === 'todo'));
  });

  await t.test('a veneer demo cannot skip the dentist and go straight to a technician', async () => {
    const { body } = await team.asDesigner('POST', '/api/orders/' + order.id + '/design-done?asRole=designer', { technicianId: team.technician.id });
    // The demo branch ignores the technician and parks the case with the dentist.
    assert.equal(body.order.status, 'waiting_doctor_approval');
    assert.equal(body.order.view.owner_role, 'dentist');
    assert.equal(body.order.view.headline, 'Waiting on the dentist');
  });

  await t.test('the dentist requests changes; it returns to the same designer', async () => {
    const { status, body } = await team.asDentist('POST', '/api/orders/' + order.id + '/doctor-decision?asRole=dentist',
      { decision: 'reject', note: 'Incisal edge too square.' });
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.order.status, 'in_design');
    assert.equal(body.order.assigned_designer_id, team.designer.id);
    // Read back as the dentist (they made this call) — the clinic is told
    // their request landed, not that a fresh demo is being prepared.
    assert.equal(body.order.view.headline, 'Your changes are being made');
    // The floor sees the same fact in operational terms.
    const labView = await viewOf(team.asDesigner, order.id, 'designer');
    assert.equal(labView.headline, 'Changes requested — back in design');
  });

  await t.test('approval flips the case to its final stage and locks the design', async () => {
    await team.asDesigner('POST', '/api/orders/' + order.id + '/design-done?asRole=designer', {});
    const { status, body } = await team.asDentist('POST', '/api/orders/' + order.id + '/doctor-decision?asRole=dentist', { decision: 'approve', note: '' });
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.order.stage_type, 'final');
    assert.equal(body.order.status, 'doctor_approved');
    // Demo cycle now reads as entirely complete; the final cycle has begun.
    assert.ok(body.order.view.journey[0].steps.every(s => s.state === 'done'));
  });

  await t.test('the final cycle runs production → QC → collection', async () => {
    let res = await team.asDesigner('POST', '/api/orders/' + order.id + '/design-done?asRole=designer', { technicianId: team.technician.id });
    assert.equal(res.body.order.status, 'in_production');
    res = await team.asTechnician('POST', '/api/orders/' + order.id + '/production-done?asRole=technician', { qcId: team.qc.id });
    assert.equal(res.body.order.status, 'qc_pending');
    res = await team.asQc('POST', '/api/orders/' + order.id + '/qc-decision?asRole=qc', { decision: 'approve', packed: true, note: 'Fit and shade verified.' });
    assert.equal(res.body.order.status, 'qc_approved');
  });
});

test('Scenario E — a failed inspection is recorded permanently and reworked', async (t) => {
  const team = await setUp();
  const order = await createOrder(team, { jobType: 'crowns' });
  await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
    { decision: 'accept', paymentChecked: true, detailsChecked: true, technicianId: team.technician.id });
  await team.asTechnician('POST', '/api/orders/' + order.id + '/production-done?asRole=technician', { qcId: team.qc.id });

  await t.test('QC fails it and it lands back with the same technician', async () => {
    const { status, body } = await team.asQc('POST', '/api/orders/' + order.id + '/qc-decision?asRole=qc', { decision: 'reject', note: 'Contact too tight.' });
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.order.status, 'in_production');
    assert.equal(body.order.assigned_technician_id, team.technician.id);
    assert.ok(body.order.view.flags.some(f => f.key === 'rework') === false, 'status has already moved on from qc_rejected');
  });

  await t.test('the second inspection passes, and the first failure is still on the record', async () => {
    await team.asTechnician('POST', '/api/orders/' + order.id + '/production-done?asRole=technician', { qcId: team.qc.id });
    const { body } = await team.asQc('POST', '/api/orders/' + order.id + '/qc-decision?asRole=qc', { decision: 'approve', packed: true, note: 'Contact adjusted and verified.' });
    assert.equal(body.order.status, 'qc_approved');

    const { body: detail } = await team.asQc('GET', '/api/orders/' + order.id + '?asRole=qc');
    const inspections = detail.approvals.filter(a => a.decision_type === 'qc_review');
    assert.equal(inspections.length, 2, 'both attempts must survive');
    assert.equal(inspections[0].outcome, 'rejected');
    assert.equal(inspections[1].outcome, 'approved');
    assert.match(inspections[0].note, /Contact too tight/);
  });
});

test('Scenario F — a blocked case is visible instead of quietly stuck', async (t) => {
  const team = await setUp();
  const order = await createOrder(team, { jobType: 'night_guard' });
  await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
    { decision: 'accept', paymentChecked: true, detailsChecked: true, technicianId: team.technician.id });

  await t.test('a blocker needs both a reason and a description', async () => {
    let res = await team.asTechnician('POST', '/api/orders/' + order.id + '/block?asRole=technician', { note: 'stuck' });
    assert.equal(res.status, 400);
    res = await team.asTechnician('POST', '/api/orders/' + order.id + '/block?asRole=technician', { reason: 'material' });
    assert.equal(res.status, 400);
  });

  await t.test('blocking flags the case and tells reception and the manager', async () => {
    const { status, body } = await team.asTechnician('POST', '/api/orders/' + order.id + '/block?asRole=technician',
      { reason: 'material', note: 'Zirconia blank back-ordered until Thursday.' });
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.order.status, 'blocked');
    assert.equal(body.order.view.is_blocked, true);
    assert.equal(body.order.view.needs_attention, true);
    assert.ok(body.order.view.flags.some(f => f.key === 'blocked'));

    const { body: labNotifications } = await team.asLab('GET', '/api/notifications');
    assert.ok(labNotifications.notifications.some(n => n.type === 'production-blocked'));
  });

  await t.test('the lab overview surfaces it without anyone searching', async () => {
    const { status, body } = await team.asLab('GET', '/api/lab/overview?asRole=lab');
    assert.equal(status, 200, JSON.stringify(body));
    // Counted, not equalled: against a persistent test database the board
    // legitimately carries cases from other runs, and an assertion that
    // only holds on an empty database is a flake waiting to happen.
    assert.ok(body.today.blocked >= 1, 'blocked count should include this case');
    assert.ok(body.attention.some(row => row.id === order.id), 'this case should be listed under attention');
    const listed = body.attention.find(row => row.id === order.id);
    assert.ok(listed.flags.some(f => f.key === 'blocked'));
    assert.equal(listed.owner_name, team.technician.name);
  });

  await t.test('resuming returns the case to the status it left, not to a guess', async () => {
    const { status, body } = await team.asTechnician('POST', '/api/orders/' + order.id + '/resume?asRole=technician', { note: 'Blank arrived.' });
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.order.status, 'in_production');
    assert.equal(body.order.blocked_reason, null);
  });
});

test('Scenario G — role boundaries hold on the server, not just in the UI', async (t) => {
  const team = await setUp();
  const order = await createOrder(team, { jobType: 'crowns' });
  await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
    { decision: 'accept', paymentChecked: true, detailsChecked: true, designerId: team.designer.id });

  await t.test('a dentist never receives an internal note, even inside a payload', async () => {
    const posted = await team.asDesigner('POST', '/api/orders/' + order.id + '/messages?asRole=designer',
      { body: 'The scan margin is unusable again on this clinic.', internal: true });
    assert.equal(posted.status, 200, JSON.stringify(posted.body));

    const dentistThread = await team.asDentist('GET', '/api/orders/' + order.id + '/messages?asRole=dentist');
    assert.equal(dentistThread.body.messages.length, 0, 'internal notes must not reach a clinic');

    const dentistDetail = await team.asDentist('GET', '/api/orders/' + order.id + '?asRole=dentist');
    assert.ok(!JSON.stringify(dentistDetail.body).includes('unusable again'), 'internal text leaked into the case detail payload');

    const labThread = await team.asDesigner('GET', '/api/orders/' + order.id + '/messages?asRole=designer');
    assert.equal(labThread.body.messages.length, 1);
    assert.equal(labThread.body.messages[0].internal, true);
  });

  await t.test('a dentist cannot write an internal note', async () => {
    const { status } = await team.asDentist('POST', '/api/orders/' + order.id + '/messages?asRole=dentist', { body: 'hidden', internal: true });
    assert.equal(status, 400);
  });

  await t.test('QC findings stay inside the lab', async () => {
    await team.asDesigner('POST', '/api/orders/' + order.id + '/design-done?asRole=designer', { technicianId: team.technician.id });
    await team.asTechnician('POST', '/api/orders/' + order.id + '/production-done?asRole=technician', { qcId: team.qc.id });
    await team.asQc('POST', '/api/orders/' + order.id + '/qc-decision?asRole=qc', { decision: 'reject', note: 'Porosity on the buccal surface.' });

    const dentistDetail = await team.asDentist('GET', '/api/orders/' + order.id + '?asRole=dentist');
    assert.ok(!JSON.stringify(dentistDetail.body).includes('Porosity'), 'QC commentary leaked to the clinic');
    const qcDetail = await team.asQc('GET', '/api/orders/' + order.id + '?asRole=qc');
    assert.ok(JSON.stringify(qcDetail.body).includes('Porosity'));
  });

  // Each role holds its own session cookie, so a role acting outside its
  // station is unauthenticated *as that station* and the middleware
  // answers 401 rather than 403. Either way the request is refused before
  // it reaches the state machine, which is the property that matters.
  const refused = status => assert.ok(status === 401 || status === 403, 'expected the request to be refused, got ' + status);

  await t.test('a technician cannot perform QC decisions, and a designer cannot block', async () => {
    let res = await team.asTechnician('POST', '/api/orders/' + order.id + '/qc-decision?asRole=technician', { decision: 'approve', packed: true, note: 'x' });
    refused(res.status);
    res = await team.asDesigner('POST', '/api/orders/' + order.id + '/block?asRole=designer', { reason: 'material', note: 'x' });
    refused(res.status);
    // And the case really did not move.
    const after = await team.asQc('GET', '/api/orders/' + order.id + '?asRole=qc');
    assert.notEqual(after.body.order.status, 'qc_approved');
    assert.notEqual(after.body.order.status, 'blocked');
  });

  await t.test('only reception and management can set priority or a target date', async () => {
    let res = await team.asDesigner('POST', '/api/orders/' + order.id + '/scheduling?asRole=designer', { priority: 'urgent' });
    refused(res.status);
    res = await team.asReception('POST', '/api/orders/' + order.id + '/scheduling?asRole=receptionist', { priority: 'urgent' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.order.priority, 'urgent');
    assert.ok(res.body.order.view.flags.some(f => f.key === 'urgent'));
  });

  await t.test('the lab-wide operational read is not reachable by a clinic', async () => {
    const { status } = await team.asDentist('GET', '/api/lab/overview?asRole=dentist');
    refused(status);
  });

  await t.test('a blocker\'s internal detail never reaches the clinic', async () => {
    const other = await createOrder(team, { jobType: 'crowns' });
    await team.asReception('POST', '/api/orders/' + other.id + '/reception-review?asRole=receptionist',
      { decision: 'accept', paymentChecked: true, detailsChecked: true, technicianId: team.technician.id });
    await team.asTechnician('POST', '/api/orders/' + other.id + '/block?asRole=technician',
      { reason: 'material', note: 'Supplier missed the shipment again.' });

    const dentistDetail = await team.asDentist('GET', '/api/orders/' + other.id + '?asRole=dentist');
    assert.ok(!JSON.stringify(dentistDetail.body).includes('Supplier missed'), 'blocker detail leaked to the clinic');
    // The clinic is still told the case is on hold — hidden detail is not
    // the same as a hidden case.
    assert.match(dentistDetail.body.order.view.headline, /on hold/i);
  });
});

test('Derived scheduling — target dates are validated and read back honestly', async (t) => {
  const team = await setUp();

  await t.test('a target date in the past is refused at creation', async () => {
    const { status } = await team.asDentist('POST', '/api/orders?asRole=dentist',
      { patientRef: 'PT-past', jobType: 'crowns', deliveryMethod: 'pickup', targetDate: '2001-01-01' });
    assert.equal(status, 400);
  });

  await t.test('a future target reads back as days remaining, and an overdue one as overdue', async () => {
    const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const order = await createOrder(team, { jobType: 'crowns', targetDate: soon });
    const view = await viewOf(team.asReception, order.id, 'receptionist');
    assert.equal(view.due.state, 'on_track');
    assert.equal(view.due.days_remaining, 3);

    // Reception can only set a future date, so overdue is reached the way
    // it is in life: by a date arriving. Asserted through the pure
    // derivation rather than by faking a clock on the server.
    const { describe } = require('../src/services/caseView');
    const stale = describe({ status: 'in_design', job_type: 'crowns', stage_type: 'final', target_date: '2020-01-01', priority: 'normal' });
    assert.equal(stale.due.state, 'overdue');
    assert.ok(stale.flags.some(f => f.key === 'overdue'));
    assert.equal(stale.needs_attention, true);

    // A finished case is never late — it was delivered, whenever that was.
    const done = describe({ status: 'completed', job_type: 'crowns', stage_type: 'final', target_date: '2020-01-01', priority: 'normal' });
    assert.equal(done.due.state, 'met');
    assert.equal(done.needs_attention, false);
  });

  await t.test('time in stage restarts on a real move and not on an unrelated edit', async () => {
    const order = await createOrder(team, { jobType: 'crowns' });
    const before = await viewOf(team.asReception, order.id, 'receptionist');
    await team.asReception('POST', '/api/orders/' + order.id + '/scheduling?asRole=receptionist', { priority: 'priority' });
    const afterEdit = await viewOf(team.asReception, order.id, 'receptionist');
    assert.ok(afterEdit.time_in_stage_ms >= before.time_in_stage_ms, 'a priority change must not reset the stage clock');

    await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
      { decision: 'accept', paymentChecked: true, detailsChecked: true, designerId: team.designer.id });
    const afterMove = await viewOf(team.asReception, order.id, 'receptionist');
    assert.ok(afterMove.time_in_stage_ms <= afterEdit.time_in_stage_ms, 'moving stage must restart the stage clock');
  });
});
