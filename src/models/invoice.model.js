const records = require('../db/records');
const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');

const SERVICE_FEES = {
  veneers: 480,
  crowns: 90,
  bridges: 320,
  implants: 200,
  surgical_guide: 150,
  dsd: 60,
  aligners: 220
};

const invoices = [];

// Called once by case.model after it builds its seeded cases, so every
// seeded case has a matching invoice — mirrors how createCase() below
// always opens an invoice alongside a new case.
function seedFromCases(cases) {
  cases.forEach((c, i) => {
    const amount = SERVICE_FEES[c.service] || 100;
    const paid = c.stage === 'ready' || i % 3 === 0;
    invoices.push({
      id: nextId('invoice', 'INV-'),
      caseId: c.id, ownerId: c.ownerId || null,
      clinic: c.clinic,
      service: c.service,
      amount,
      status: paid ? 'paid' : (i === 1 ? 'overdue' : 'unpaid'),
      issuedAt: c.createdAt,
      paidAt: paid ? daysAgo(i % 6) : null
    });
  });
  records.register('invoices', invoices);
}

async function createInvoiceForCase(c) {
  const inv = {
    id: nextId('invoice', 'INV-'),
    caseId: c.id, ownerId: c.ownerId || null,
    clinic: c.clinic,
    service: c.service,
    amount: SERVICE_FEES[c.service] || 100,
    status: 'unpaid',
    issuedAt: new Date(),
    paidAt: null
  };
  await records.insert('invoices', inv);
  return inv;
}

async function payInvoice(id) {
  return records.update('invoices', id, row => { if (row.status !== 'paid') { row.status = 'paid'; row.paidAt = new Date(); } });
}

records.register('invoices', invoices);
async function list(options) { return records.list('invoices', options); }
module.exports = { list, SERVICE_FEES, invoices, seedFromCases, createInvoiceForCase, payInvoice };
