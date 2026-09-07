// Locks in the one safeguard that would be genuinely catastrophic to lose:
// nothing should ever be able to lock the client out of their own admin
// panel by deactivating or deleting the last active admin account.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const userModel = require('../src/models/user.model');

test('last-admin safeguard', async (t) => {
  // Reduce to exactly one active admin (the seeded default plus any test
  // fixtures created earlier in this process) so the safeguard's boundary
  // condition is actually exercised.
  await require('./helpers/testApp').makeTestUser('admin');
  const admins = (await userModel.list()).filter(u => u.role === 'admin' && u.active !== false);
  for (const a of admins.slice(1)) await userModel.setActive(a.id, false);
  const lastAdmin = (await userModel.list()).find(u => u.role === 'admin' && u.active !== false);
  assert.ok(lastAdmin, 'expected exactly one active admin to remain for this test');

  await t.test('cannot deactivate the last admin', async () => {
    const result = await userModel.setActive(lastAdmin.id, false);
    assert.ok(result.error, 'expected an error, not a successful deactivation');
    const stillActive = (await userModel.list()).find(u => u.id === lastAdmin.id).active;
    assert.notEqual(stillActive, false);
  });

  await t.test('cannot delete the last admin', async () => {
    const result = await userModel.removeUser(lastAdmin.id);
    assert.ok(result.error, 'expected an error, not a successful delete');
    assert.ok((await userModel.list()).find(u => u.id === lastAdmin.id), 'the account must still exist');
  });

  await t.test('holds under a concurrent-looking burst of attempts', async () => {
    const results = [];
    for (let i = 0; i < 20; i++) results.push(await userModel.setActive(lastAdmin.id, false));
    assert.ok(results.every(r => r.error), 'every single attempt must be blocked');
    assert.notEqual((await userModel.list()).find(u => u.id === lastAdmin.id).active, false);
  });

  await t.test('a second admin CAN be deactivated once it is no longer the last one', async () => {
    const authService = require('../src/services/auth.service');
    const hash = await authService.hashPassword('TestPassword12345');
    const extra = await userModel.createUser({ username: 'test-extra-admin', passwordHash: hash, role: 'admin', name: 'Extra Admin' });
    const result = await userModel.setActive(extra.id, false);
    assert.equal(result.error, undefined);
  });
});
