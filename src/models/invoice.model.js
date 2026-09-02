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
      caseId: c.id,
      clinic: c.clinic,
      service: c.service,
      amount,
      status: paid ? 'paid' : (i === 1 ? 'overdue' : 'unpaid'),
      issuedAt: c.createdAt,
      paidAt: paid ? daysAgo(i % 6) : null
    });
  });
}

function createInvoiceForCase(c) {
  const inv = {
    id: nextId('invoice', 'INV-'),
    caseId: c.id,
    clinic: c.clinic,
    service: c.service,
    amount: SERVICE_FEES[c.service] || 100,
    status: 'unpaid',
    issuedAt: new Date(),
    paidAt: null
  };
  invoices.unshift(inv);
  return inv;
}

function payInvoice(id) {
  const inv = invoices.find(x => x.id === id);
  if (!inv) return null;
  inv.status = 'paid';
  inv.paidAt = new Date();
  return inv;
}

module.exports = { SERVICE_FEES, invoices, seedFromCases, createInvoiceForCase, payInvoice };
