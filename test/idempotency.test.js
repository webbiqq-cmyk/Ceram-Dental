const { test } = require('node:test');
const assert = require('node:assert/strict');
const idempotency = require('../src/models/idempotency.model');
const { startTestServer } = require('./helpers/testApp');

test('idempotency model', async (t) => {
  await t.test('first request proceeds, a concurrent second is told to wait', async () => {
    const r1 = await idempotency.begin('t:route', 'caller-1', 'key-a');
    assert.equal(r1.existing, null);
    const r2 = await idempotency.begin('t:route', 'caller-1', 'key-a');
    assert.equal(r2.existing.status, 'pending');
  });

  await t.test('once completed, a retry replays the stored response', async () => {
    const { key } = await idempotency.begin('t:route', 'caller-2', 'key-b');
    await idempotency.complete(key, 200, { ok: true, from: 'original' });
    const retry = await idempotency.begin('t:route', 'caller-2', 'key-b');
    assert.equal(retry.existing.status, 'done');
    assert.equal(retry.existing.statusCode, 200);
    assert.deepEqual(retry.existing.body, { ok: true, from: 'original' });
  });

  await t.test('different callers with the same key text never collide', async () => {
    await idempotency.begin('t:route', 'caller-3', 'shared-text');
    const other = await idempotency.begin('t:route', 'caller-4', 'shared-text');
    assert.equal(other.existing, null, 'a different caller must get an independent scope');
  });

  await t.test('abandon() frees the key for a clean retry', async () => {
    const { key } = await idempotency.begin('t:route', 'caller-5', 'key-c');
    await idempotency.abandon(key);
    const retry = await idempotency.begin('t:route', 'caller-5', 'key-c');
    assert.equal(retry.existing, null, 'an abandoned key must not still look pending or done');
  });
});

test('idempotency over HTTP', async (t) => {
  const { baseUrl, close } = await startTestServer();
  t.after(close);

  await t.test('a repeated case-creation request with the same key returns the same case, not a duplicate', async () => {
    const key = 'http-test-key-' + Math.random();
    const body = JSON.stringify({ clinic: 'Test Clinic', patient: 'Test Patient', service: 'crowns', shade: 'A2' });
    const first = await fetch(baseUrl + '/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body }).then(r => r.json());
    const second = await fetch(baseUrl + '/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body }).then(r => r.json());
    assert.equal(first.case.id, second.case.id);
  });

  await t.test('a failed attempt does not poison the key — a corrected retry succeeds', async () => {
    const key = 'http-fail-then-fix-' + Math.random();
    const failed = await fetch(baseUrl + '/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ clinic: 'No Service' }) }).then(r => r.json());
    assert.equal(failed.ok, false);
    const fixed = await fetch(baseUrl + '/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ clinic: 'No Service', service: 'implants' }) }).then(r => r.json());
    assert.ok(fixed.case && fixed.case.id, 'the retry after fixing the input should succeed, not replay the earlier failure');
  });

  await t.test('no Idempotency-Key header behaves exactly as before — two separate cases', async () => {
    const body = JSON.stringify({ clinic: 'No Key Clinic', patient: 'X', service: 'bridges', shade: 'A1' });
    const a = await fetch(baseUrl + '/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).then(r => r.json());
    const b = await fetch(baseUrl + '/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).then(r => r.json());
    assert.notEqual(a.case.id, b.case.id);
  });
});
