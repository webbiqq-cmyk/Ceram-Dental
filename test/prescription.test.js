// The clinic-approved prescription catalogue.
//
// Two things are worth guarding here. First, that the catalogue is the
// only authority: a client cannot store an option the clinic never
// approved, nor a key the catalogue does not define, nor an answer to a
// question that does not apply to the case it is on. Second, that the
// browser is served the *same* catalogue — a schema that cannot survive
// JSON is a schema the form will quietly disagree with.
process.env.REQUIRE_LOGIN = 'true';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const catalogue = require('../src/services/prescription');
const { startTestServer, makeTestUser } = require('./helpers/testApp');

test('normalise accepts only clinic-approved options', () => {
  const ok = catalogue.normalise('crown', { restorationSubtype: 'inlay', material: 'emax', shade: 'ND3' });
  assert.deepEqual(ok, { treatment: 'crown', restorationSubtype: 'inlay', material: 'emax', shade: 'ND3' });

  assert.throws(() => catalogue.normalise('crown', { material: 'gold_foil' }), /Unknown option for Material/);
  assert.throws(() => catalogue.normalise('crown', { shade: 'Z9' }), /Unknown shade/);
  assert.throws(() => catalogue.normalise('gold_tooth', {}), /Unknown treatment/);
});

test('keys the catalogue does not define are dropped, not stored', () => {
  const stored = catalogue.normalise('veneer', { material: 'emax', priceOverride: 0, adminNote: 'x' });
  assert.deepEqual(Object.keys(stored).sort(), ['material', 'treatment']);
});

test('an answer to a question that no longer applies is dropped', () => {
  // Pontic type exists on an implant case only for a bridge or full arch.
  const bridge = catalogue.normalise('implant', { restorationType: 'bridge', ponticType: 'ovate', material: 'zirconia' });
  assert.equal(bridge.ponticType, 'ovate');

  const single = catalogue.normalise('implant', { restorationType: 'single_crown', ponticType: 'ovate', material: 'zirconia' });
  assert.equal(single.ponticType, undefined, 'a single crown must not carry a pontic type to the bench');

  // Same rule for the tissue shade, which only applies to FP2/FP3.
  assert.equal(catalogue.normalise('implant', { fpClassification: 'fp1', gingivaShade: 'pink' }).gingivaShade, undefined);
  assert.equal(catalogue.normalise('implant', { fpClassification: 'fp3', gingivaShade: 'pink' }).gingivaShade, 'pink');
});

test('free text is only kept where its parent answer asked for it', () => {
  const custom = catalogue.normalise('crown', { material: 'other', materialOther: 'Composite, patient request' });
  assert.equal(custom.materialOther, 'Composite, patient request');

  const named = catalogue.normalise('crown', { material: 'emax', materialOther: 'ignore me' });
  assert.equal(named.materialOther, undefined);
});

test('teeth are stored as numbers the chart recognises', () => {
  const p = catalogue.normalise('crown', { teeth: [16, '26', 16, 99, 'left molar'] });
  assert.deepEqual(p.teeth, [16, 26], 'duplicates and anything outside FDI are discarded');
});

test('text answers are bounded', () => {
  const long = catalogue.normalise('ortho', { shippingInstructions: 'x'.repeat(900), notes: 'y'.repeat(4000) });
  assert.equal(long.shippingInstructions.length, 500);
  assert.equal(long.notes.length, 3000);
});

test('the job type follows the prescription, not the other way round', () => {
  assert.equal(catalogue.jobTypeFor('implant', { restorationType: 'full_arch' }), 'implant_full_arch');
  assert.equal(catalogue.jobTypeFor('implant', { restorationType: 'bridge' }), 'implant_bridge');
  assert.equal(catalogue.jobTypeFor('implant', {}), 'implant_crown');
  assert.equal(catalogue.jobTypeFor('ortho', { applianceType: 'night_guard' }), 'night_guard');
  assert.equal(catalogue.jobTypeFor('ortho', {}), 'ortho_work');
  assert.equal(catalogue.jobTypeFor('veneer', {}), 'veneers');
});

test('missingRequired ignores a requirement that does not apply yet', () => {
  assert.deepEqual(catalogue.missingRequired('ortho', {}), ['arch', 'applianceType', 'material']);
  assert.deepEqual(catalogue.missingRequired('ortho', { arch: 'upper', applianceType: 'essix_retainer', material: 'clear' }), []);
});

test('the catalogue the browser fetches survives JSON intact', () => {
  const served = JSON.parse(JSON.stringify(catalogue.catalogue()));
  assert.deepEqual(served.treatments.implant.jobType, catalogue.TREATMENTS.implant.jobType,
    'the job-type rule must be data, or the form and the server will disagree');
  assert.ok(served.shades.includes('ND5'), 'the ND range reaches the browser');
  for (const [key, treatment] of Object.entries(served.treatments)) {
    assert.ok(treatment.sections.length, key + ' has no sections to render');
    assert.ok(['teeth', 'arch'].includes(treatment.selection), key + ' has no selection mode');
    const keys = treatment.sections.flatMap(s => s.fields).map(f => f.key);
    for (const required of treatment.required) {
      assert.ok(keys.includes(required), key + ' requires ' + required + ' but never asks for it');
    }
  }
});

// ------------------------------------------------------------------ API

function cookieOf(res) { return res.headers.get('set-cookie').split(';')[0]; }
async function signIn(baseUrl, role) {
  const account = await makeTestUser(role);
  const res = await fetch(baseUrl + '/api/auth/' + role + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: account.username, password: account.password })
  });
  assert.equal(res.status, 200, 'could not sign in as ' + role);
  return { id: account.user.id, cookie: cookieOf(res) };
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

const RUN = Math.random().toString(36).slice(2, 8).toUpperCase();

test('a case carries its prescription from the clinic to the lab', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);
  const dentist = await signIn(baseUrl, 'dentist');
  const reception = await signIn(baseUrl, 'receptionist');
  const asDentist = client(baseUrl, dentist), asReception = client(baseUrl, reception);

  const schema = await asDentist('GET', '/api/prescription-schema');
  assert.equal(schema.status, 200);
  assert.ok(schema.body.treatments.ortho, 'the orthodontic sheet is served');

  const created = await asDentist('POST', '/api/orders', {
    patientRef: 'PT-RX-' + RUN, jobType: 'crowns', shade: 'ND2', instructions: 'Crown for 16.',
    prescription: { treatment: 'crown', restorationSubtype: 'onlay', material: 'zirconia', shade: 'ND2', occlusalDesign: 'deep_fissure', teeth: [16] }
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.order.id;

  const seen = await asReception('GET', '/api/orders/' + id + '?asRole=receptionist');
  assert.equal(seen.body.order.prescription.occlusalDesign, 'deep_fissure',
    'the bench reads the prescription as data, not as prose');
  assert.deepEqual(seen.body.order.prescription.teeth, [16]);
});

test('a prescription that contradicts the chosen treatment is refused', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);
  const asDentist = client(baseUrl, await signIn(baseUrl, 'dentist'));

  const mismatch = await asDentist('POST', '/api/orders', {
    patientRef: 'PT-RXBAD-' + RUN, jobType: 'implant_crown', instructions: 'x',
    scanBody: 'SB', implantSystem: 'NC 3.3', abutmentSize: '4mm',
    prescription: { treatment: 'implant', restorationType: 'full_arch', material: 'zirconia' }
  });
  assert.equal(mismatch.status, 400);
  assert.match(mismatch.body.error || mismatch.body.message || '', /does not match/i);

  const invented = await asDentist('POST', '/api/orders', {
    patientRef: 'PT-RXBAD2-' + RUN, jobType: 'crowns', instructions: 'x',
    prescription: { treatment: 'crown', material: 'unobtainium' }
  });
  assert.equal(invented.status, 400);
});

test('a case created without a prescription still works', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);
  const asDentist = client(baseUrl, await signIn(baseUrl, 'dentist'));
  const created = await asDentist('POST', '/api/orders', {
    patientRef: 'PT-LEGACY-' + RUN, jobType: 'crowns', shade: 'A2', instructions: 'Legacy prose only.'
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.equal(created.body.order.prescription ?? null, null,
    'nothing is invented for a case that did not send one');
});

test('the prescription schema is not public', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);
  const res = await fetch(baseUrl + '/api/prescription-schema');
  assert.equal(res.status, 401);
});
