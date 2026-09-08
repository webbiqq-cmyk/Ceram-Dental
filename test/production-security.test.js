const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ipInList } = require('../src/utils/clientIp');

test('ipInList — exact IPv4', () => {
  assert.equal(ipInList('203.0.113.7', ['203.0.113.7']), true);
  assert.equal(ipInList('203.0.113.8', ['203.0.113.7']), false);
  assert.equal(ipInList('203.0.113.7', []), false);
  assert.equal(ipInList('', ['203.0.113.7']), false);
});

test('ipInList — IPv4 CIDR', () => {
  assert.equal(ipInList('203.0.113.42', ['203.0.113.0/24']), true);
  assert.equal(ipInList('203.0.114.1', ['203.0.113.0/24']), false);
  assert.equal(ipInList('10.1.2.3', ['10.0.0.0/8']), true);
  assert.equal(ipInList('11.1.2.3', ['10.0.0.0/8']), false);
});

test('ipInList — IPv6 + mapped', () => {
  assert.equal(ipInList('2001:db8::1', ['2001:db8::/32']), true);
  assert.equal(ipInList('2001:db9::1', ['2001:db8::/32']), false);
  assert.equal(ipInList('::ffff:203.0.113.7', ['203.0.113.7']), true, 'v4-mapped v6 normalises');
});

test('ipInList — family mismatch never matches', () => {
  assert.equal(ipInList('203.0.113.7', ['2001:db8::/32']), false);
  assert.equal(ipInList('2001:db8::1', ['203.0.113.0/24']), false);
});

test('requireClinicIP is a no-op when no allowlist is configured', async () => {
  // No CLINIC_IP_ALLOWLIST in the test env -> LAB_IP_ENFORCED is false.
  const { requireClinicIP } = require('../src/middleware/clinicIp');
  let nexted = false;
  requireClinicIP({ clientIp: '198.51.100.9', method: 'POST', originalUrl: '/api/orders/x/qc-decision' },
    { status() { throw new Error('should not 403'); } }, () => { nexted = true; });
  assert.equal(nexted, true);
});

test('role groups cover the required production roles', () => {
  const { ROLE_GROUPS, ROLES } = require('../src/models/user.model');
  for (const r of ['admin', 'lab_manager', 'technician', 'designer', 'qc', 'dispatch', 'dentist', 'in_house_dentist']) {
    assert.ok(ROLES.includes(r), 'ROLES includes ' + r);
  }
  assert.ok(ROLE_GROUPS.LAB.includes('qc'));
  assert.ok(ROLE_GROUPS.DENTIST.includes('in_house_dentist'));
  assert.ok(!ROLE_GROUPS.LAB.includes('admin'));
});
