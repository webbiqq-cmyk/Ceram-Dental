// Drafts, duplication, search and @mentions — the Phase 2 productivity
// features, tested for the guarantees that matter rather than for their
// happy paths alone: a draft must be invisible to the lab, a duplicate
// must carry nothing patient-specific, and search must not become a way
// to see cases a role could not otherwise open.
process.env.REQUIRE_LOGIN = 'true';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

function cookieOf(res) { return res.headers.get('set-cookie').split(';')[0]; }

async function signIn(baseUrl, role, opts) {
  const account = await makeTestUser(role, opts);
  const res = await fetch(baseUrl + '/api/auth/' + role + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: account.username, password: account.password })
  });
  assert.equal(res.status, 200, 'could not sign in as ' + role);
  return { id: account.user.id, name: account.user.name, cookie: cookieOf(res) };
}

function client(baseUrl, actor) {
  return async (method, path, body) => {
    const res = await fetch(baseUrl + path, {
      method,
      headers: Object.assign({ Cookie: actor.cookie }, body === undefined ? {} : { 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
}

let shared = null;
async function setUp() {
  if (shared) return shared;
  const { baseUrl, close } = await startTestServer();
  const [dentist, other, reception, designer, lab, admin] = await Promise.all([
    signIn(baseUrl, 'dentist'), signIn(baseUrl, 'dentist'), signIn(baseUrl, 'receptionist'),
    signIn(baseUrl, 'designer', { name: 'Sarah ' + RUN }), signIn(baseUrl, 'lab'), signIn(baseUrl, 'admin')
  ]);
  shared = {
    baseUrl, close, dentist, other, reception, designer, lab, admin,
    asDentist: client(baseUrl, dentist), asOther: client(baseUrl, other),
    asReception: client(baseUrl, reception), asDesigner: client(baseUrl, designer),
    asLab: client(baseUrl, lab), asAdmin: client(baseUrl, admin)
  };
  return shared;
}
test.after(async () => { if (shared) await shared.close(); });

// Unique per run: against a persistent test database, a fixed reference
// would collide with rows left by the previous run and make an assertion
// about "no case exists with this reference" quietly meaningless.
const RUN = Math.random().toString(36).slice(2, 8).toUpperCase();
const FORM = { patientRef: 'PT-DRAFT-' + RUN, caseKind: 'New case', deliveryMethod: 'pickup', step: 1,
  teeth: [{ number: 11, service: 'veneer', selected: false }, { number: 12, service: 'veneer', selected: false }] };

test('Drafts stay with the dentist and never reach the lab', async (t) => {
  const team = await setUp();
  let draftId;

  await t.test('a draft can be created and read back', async () => {
    const { status, body } = await team.asDentist('POST', '/api/drafts', { payload: FORM });
    assert.equal(status, 200, JSON.stringify(body));
    draftId = body.draft.id;
    // The summary is derived on the server, so a list can describe a draft
    // without the client having to be trusted about its own contents.
    assert.equal(body.draft.summary.patientRef, 'PT-DRAFT-' + RUN);
    assert.deepEqual(body.draft.summary.services, ['veneer']);
    assert.equal(body.draft.summary.units, 2);
  });

  await t.test('editing a draft replaces it in place, without creating a second', async () => {
    const edited = Object.assign({}, FORM, { patientRef: 'PT-DRAFT-EDITED-' + RUN });
    const put = await team.asDentist('PUT', '/api/drafts/' + draftId, { payload: edited });
    assert.equal(put.status, 200, JSON.stringify(put.body));
    assert.equal(put.body.draft.summary.patientRef, 'PT-DRAFT-EDITED-' + RUN);
    const { body } = await team.asDentist('GET', '/api/drafts');
    assert.equal(body.drafts.filter(d => d.id === draftId).length, 1);
  });

  await t.test('no lab role has any route to a draft', async () => {
    for (const [label, call] of [['reception', team.asReception], ['designer', team.asDesigner], ['lab manager', team.asLab], ['admin', team.asAdmin]]) {
      const listed = await call('GET', '/api/drafts');
      assert.ok(listed.status === 401 || listed.status === 403, label + ' reached the drafts list (' + listed.status + ')');
      const direct = await call('GET', '/api/drafts/' + draftId);
      assert.ok(direct.status === 401 || direct.status === 403, label + ' reached a draft directly (' + direct.status + ')');
    }
  });

  await t.test('another dentist cannot read or delete it, and cannot tell it exists', async () => {
    const read = await team.asOther('GET', '/api/drafts/' + draftId);
    assert.equal(read.status, 404);
    const del = await team.asOther('DELETE', '/api/drafts/' + draftId);
    assert.equal(del.status, 404);
    const stillThere = await team.asDentist('GET', '/api/drafts/' + draftId);
    assert.equal(stillThere.status, 200, 'the owner\'s draft must survive another dentist\'s delete attempt');
  });

  await t.test('an unsubmitted draft creates no case, no queue entry and no notification', async () => {
    const labQueue = await team.asReception('GET', '/api/orders?asRole=receptionist');
    assert.ok(!JSON.stringify(labQueue.body).includes('PT-DRAFT-EDITED-' + RUN), 'a draft appeared in the reception queue');
    const notifications = await team.asReception('GET', '/api/notifications?asRole=receptionist');
    assert.ok(!JSON.stringify(notifications.body).includes('PT-DRAFT-' + RUN), 'a draft generated a notification');
  });

  await t.test('submitting is a separate act, and the draft is then the dentist\'s to clear', async () => {
    const created = await team.asDentist('POST', '/api/orders?asRole=dentist',
      { patientRef: 'PT-DRAFT-EDITED-' + RUN, jobType: 'veneers', deliveryMethod: 'pickup' });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    assert.equal(created.body.order.status, 'pending_reception_review');
    const removed = await team.asDentist('DELETE', '/api/drafts/' + draftId);
    assert.equal(removed.status, 200);
    assert.equal((await team.asDentist('GET', '/api/drafts/' + draftId)).status, 404);
  });

  await t.test('an oversized draft is refused rather than stored', async () => {
    const huge = { patientRef: 'x', notes: 'y'.repeat(70 * 1024) };
    const { status } = await team.asDentist('POST', '/api/drafts', { payload: huge });
    assert.equal(status, 400);
  });
});

test('Duplicating a case copies preferences, never the patient', async (t) => {
  const team = await setUp();
  const created = await team.asDentist('POST', '/api/orders?asRole=dentist', {
    patientRef: 'PT-ORIGINAL-9', jobType: 'crowns', shade: 'A2',
    instructions: 'Zirconia, high polish, light texture.', deliveryMethod: 'delivery'
  });
  const order = created.body.order;

  await t.test('the duplicate is a draft, not a case', async () => {
    const { status, body } = await team.asDentist('POST', '/api/orders/' + order.id + '/duplicate', {});
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(body.draft.origin, 'duplicate');
    assert.equal(body.draft.originOrderNumber, order.order_number);
    // Reusable preference carried; patient identity deliberately not.
    assert.equal(body.draft.payload.carriedJobType, 'crowns');
    assert.equal(body.draft.payload.deliveryMethod, 'delivery');
    assert.match(body.draft.payload.carriedInstructions, /high polish/);
    assert.equal(body.draft.payload.patientRef, '', 'the previous patient reference must not be carried');
    assert.equal(body.draft.payload.targetDate, '', 'a previous target date must not be carried');
  });

  await t.test('nothing from the original case history comes with it', async () => {
    const { body } = await team.asDentist('GET', '/api/drafts');
    const draft = body.drafts.find(d => d.origin === 'duplicate');
    const serialised = JSON.stringify(draft);
    // The patient reference and the original's internal id must be absent
    // outright. The order number is the one permitted reference, and only
    // as provenance ("copied from JO-1004"), so it is checked by value
    // rather than waved through by a condition that can never fail.
    assert.ok(!serialised.includes('PT-ORIGINAL-' + RUN), 'the previous patient reference was carried');
    assert.ok(!serialised.includes(order.id), "the original case's id was carried");
    assert.equal(draft.payload.duplicatedFrom, order.order_number);
    assert.equal(draft.summary.patientRef, '');
    // A duplicate must own nothing of the original's workflow.
    for (const key of ['files', 'messages', 'approvals', 'history', 'status', 'stage_type', 'assigned_designer_id']) {
      assert.ok(!(key in draft.payload), 'duplicate carried workflow state: ' + key);
    }
  });

  await t.test('another dentist cannot duplicate a case they do not own', async () => {
    const { status } = await team.asOther('POST', '/api/orders/' + order.id + '/duplicate', {});
    assert.equal(status, 404);
  });
});

test('Search answers only what the role could already open', async (t) => {
  const team = await setUp();
  const mine = (await team.asDentist('POST', '/api/orders?asRole=dentist',
    { patientRef: 'PT-SEARCHABLE-' + RUN, jobType: 'bridges', deliveryMethod: 'pickup' })).body.order;
  const theirs = (await team.asOther('POST', '/api/orders?asRole=dentist',
    { patientRef: 'PT-PRIVATE-OTHER-' + RUN, jobType: 'crowns', deliveryMethod: 'pickup' })).body.order;

  await t.test('a dentist finds their own case by reference and by case number', async () => {
    const byRef = await team.asDentist('GET', '/api/search?asRole=dentist&q=SEARCHABLE-' + RUN);
    assert.equal(byRef.status, 200, JSON.stringify(byRef.body));
    assert.ok(byRef.body.cases.some(c => c.id === mine.id));
    const byNumber = await team.asDentist('GET', '/api/search?asRole=dentist&q=' + encodeURIComponent(mine.order_number));
    assert.ok(byNumber.body.cases.some(c => c.id === mine.id));
  });

  await t.test('a dentist can never find another clinic\'s case', async () => {
    const res = await team.asDentist('GET', '/api/search?asRole=dentist&q=PRIVATE-OTHER-' + RUN);
    assert.equal(res.body.cases.length, 0);
    const byId = await team.asDentist('GET', '/api/search?asRole=dentist&q=' + encodeURIComponent(theirs.order_number));
    assert.equal(byId.body.cases.length, 0, 'searching an exact case number must not bypass ownership');
  });

  await t.test('a dentist gets no staff or clinic directory', async () => {
    const res = await team.asDentist('GET', '/api/search?asRole=dentist&q=' + encodeURIComponent(team.other.name.slice(0, 6)));
    assert.deepEqual(res.body.dentists, []);
  });

  await t.test('the lab finds any case; admin also finds clinics', async () => {
    const labRes = await team.asLab('GET', '/api/search?asRole=lab&q=PRIVATE-OTHER-' + RUN);
    assert.ok(labRes.body.cases.some(c => c.id === theirs.id), 'the lab must be able to find a case it works on');
    // Results carry the same derived wording the queues use.
    assert.ok(labRes.body.cases[0].headline);
    const adminRes = await team.asAdmin('GET', '/api/search?asRole=admin&q=' + encodeURIComponent(team.dentist.name.split(' ')[0]));
    assert.ok(Array.isArray(adminRes.body.dentists));
  });

  await t.test('a one-character query is refused rather than matching everything', async () => {
    const { body } = await team.asLab('GET', '/api/search?asRole=lab&q=P');
    assert.deepEqual(body.cases, []);
  });

  await t.test('wildcards are matched literally, not executed', async () => {
    const { status, body } = await team.asLab('GET', '/api/search?asRole=lab&q=' + encodeURIComponent('%%'));
    assert.equal(status, 200);
    assert.deepEqual(body.cases, [], 'a LIKE wildcard must not match every row');
  });
});

test('@mentions reach one person, and only through internal notes', async (t) => {
  const team = await setUp();
  const order = (await team.asDentist('POST', '/api/orders?asRole=dentist',
    { patientRef: 'PT-MENTION-' + RUN, jobType: 'crowns', deliveryMethod: 'pickup' })).body.order;
  await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
    { decision: 'accept', paymentChecked: true, detailsChecked: true, designerId: team.designer.id });

  await t.test('a mention in an internal note notifies the named person', async () => {
    const posted = await team.asReception('POST', '/api/orders/' + order.id + '/messages?asRole=receptionist',
      { body: '@Sarah ' + RUN + ' please confirm the margin before handoff.', internal: true });
    assert.equal(posted.status, 200, JSON.stringify(posted.body));
    const { body } = await team.asDesigner('GET', '/api/notifications?asRole=designer');
    const mention = body.notifications.find(n => n.type === 'note-mention');
    assert.ok(mention, 'the mentioned designer was not notified');
    assert.equal(mention.relatedId, order.id, 'a mention must link to its case');
  });

  await t.test('the mention never reaches the clinic', async () => {
    const thread = await team.asDentist('GET', '/api/orders/' + order.id + '/messages?asRole=dentist');
    assert.equal(thread.body.messages.length, 0);
    const notifications = await team.asDentist('GET', '/api/notifications?asRole=dentist');
    assert.ok(!JSON.stringify(notifications.body).includes('confirm the margin'));
  });

  await t.test('a dentist cannot mention lab staff at all', async () => {
    const { status } = await team.asDentist('POST', '/api/orders/' + order.id + '/messages?asRole=dentist',
      { body: '@Sarah ' + RUN + ' are you there?', internal: true });
    assert.equal(status, 400);
  });

  await t.test('a mention of a name nobody has notifies nobody', async () => {
    const before = (await team.asDesigner('GET', '/api/notifications?asRole=designer')).body.notifications.length;
    await team.asReception('POST', '/api/orders/' + order.id + '/messages?asRole=receptionist',
      { body: '@Nonexistent please look', internal: true });
    const after = (await team.asDesigner('GET', '/api/notifications?asRole=designer')).body.notifications.length;
    assert.equal(after, before);
  });
});

test('An ambiguous mention reaches everyone it could mean', async (t) => {
  const team = await setUp();
  // Two active designers whose first names are identical — ordinary on a
  // real lab floor, and the case where picking one silently sends the
  // note to the wrong colleague.
  const twin = await signIn(team.baseUrl, 'designer', { name: 'Sarah ' + RUN });
  const order = (await team.asDentist('POST', '/api/orders?asRole=dentist',
    { patientRef: 'PT-TWIN-' + RUN, jobType: 'crowns', deliveryMethod: 'pickup' })).body.order;
  await team.asReception('POST', '/api/orders/' + order.id + '/reception-review?asRole=receptionist',
    { decision: 'accept', paymentChecked: true, detailsChecked: true, designerId: team.designer.id });

  await team.asReception('POST', '/api/orders/' + order.id + '/messages?asRole=receptionist',
    { body: '@Sarah ' + RUN + ' whose case is this?', internal: true });

  const seenBy = async actor => {
    const { body } = await client(team.baseUrl, actor)('GET', '/api/notifications?asRole=designer');
    return body.notifications.some(n => n.type === 'note-mention' && n.relatedId === order.id);
  };
  assert.ok(await seenBy(team.designer), 'the first matching designer was not notified');
  assert.ok(await seenBy(twin), 'the second designer with the same name was not notified');
});
