const caseModel = require('../models/case.model');
const invoiceModel = require('../models/invoice.model');
const expenseModel = require('../models/expense.model');
const appointmentModel = require('../models/appointment.model');
const orderModel = require('../models/order.model');
const summaryService = require('../services/summary.service');
const { inRange, resolveRange, buildXlsx, sendXlsx, buildReportDocx, sendDocx } = require('../services/export.service');
const { logAction } = require('../utils/audit');
const { asyncHandler } = require('../utils/asyncHandler');

async function invoices(req, res) {
  const { from, to } = resolveRange(req.query);
  const rows = invoiceModel.invoices
    .filter(i => inRange(i.issuedAt, from, to))
    .map(i => ({ id: i.id, caseId: i.caseId, clinic: i.clinic, service: i.service, amount: i.amount, status: i.status, issuedAt: fmt(i.issuedAt), paidAt: i.paidAt ? fmt(i.paidAt) : '' }));
  const buf = await buildXlsx('Invoices', [
    { header: 'Invoice', key: 'id', width: 12 }, { header: 'Case', key: 'caseId', width: 12 },
    { header: 'Clinic', key: 'clinic', width: 28 }, { header: 'Service', key: 'service', width: 16 },
    { header: 'Amount (BD)', key: 'amount', width: 14 }, { header: 'Status', key: 'status', width: 12 },
    { header: 'Issued', key: 'issuedAt', width: 14 }, { header: 'Paid', key: 'paidAt', width: 14 }
  ], rows);
  logAction(req, 'export:invoices', from + ' to ' + to);
  sendXlsx(res, 'invoices_' + from + '_to_' + to + '.xlsx', buf);
}

async function expenses(req, res) {
  const { from, to } = resolveRange(req.query);
  const rows = expenseModel.expenses
    .filter(e => inRange(e.date, from, to))
    .map(e => ({ id: e.id, category: e.category, description: e.description, amount: e.amount, date: fmt(e.date) }));
  const buf = await buildXlsx('Expenses', [
    { header: 'Expense', key: 'id', width: 12 }, { header: 'Category', key: 'category', width: 16 },
    { header: 'Description', key: 'description', width: 36 }, { header: 'Amount (BD)', key: 'amount', width: 14 },
    { header: 'Date', key: 'date', width: 14 }
  ], rows);
  logAction(req, 'export:expenses', from + ' to ' + to);
  sendXlsx(res, 'expenses_' + from + '_to_' + to + '.xlsx', buf);
}

async function appointments(req, res) {
  const { from, to } = resolveRange(req.query);
  const rows = appointmentModel.appointments
    .filter(a => inRange(a.createdAt, from, to))
    .map(a => ({ id: a.id, name: a.name, phone: a.phone, service: a.service, preferredDate: a.preferredDate ? fmt(a.preferredDate) : '', status: a.status, createdAt: fmt(a.createdAt) }));
  const buf = await buildXlsx('Appointments', [
    { header: 'Request', key: 'id', width: 12 }, { header: 'Name', key: 'name', width: 22 },
    { header: 'Phone', key: 'phone', width: 16 }, { header: 'Service', key: 'service', width: 16 },
    { header: 'Preferred Date', key: 'preferredDate', width: 14 }, { header: 'Status', key: 'status', width: 12 },
    { header: 'Submitted', key: 'createdAt', width: 14 }
  ], rows);
  logAction(req, 'export:appointments', from + ' to ' + to);
  sendXlsx(res, 'appointments_' + from + '_to_' + to + '.xlsx', buf);
}

async function cases(req, res) {
  const { from, to } = resolveRange(req.query);
  const rows = caseModel.cases
    .filter(c => inRange(c.createdAt, from, to))
    .map(c => ({ id: c.id, clinic: c.clinic, patient: c.patient, service: c.service, stage: c.stage, tech: c.tech, shade: c.shade, revisions: c.revisions, createdAt: fmt(c.createdAt) }));
  const buf = await buildXlsx('Cases', [
    { header: 'Case', key: 'id', width: 12 }, { header: 'Clinic', key: 'clinic', width: 28 },
    { header: 'Patient', key: 'patient', width: 16 }, { header: 'Service', key: 'service', width: 16 },
    { header: 'Stage', key: 'stage', width: 16 }, { header: 'Technician', key: 'tech', width: 14 },
    { header: 'Shade', key: 'shade', width: 10 }, { header: 'Revisions', key: 'revisions', width: 10 },
    { header: 'Created', key: 'createdAt', width: 14 }
  ], rows);
  logAction(req, 'export:cases', from + ' to ' + to);
  sendXlsx(res, 'cases_' + from + '_to_' + to + '.xlsx', buf);
}

async function orders(req, res) {
  const { from, to } = resolveRange(req.query);
  const rows = orderModel.orders
    .filter(o => inRange(o.createdAt, from, to))
    .map(o => ({ id: o.id, customer: (o.customer && o.customer.name) || 'Guest', items: o.items.map(i => i.qty + '× ' + i.name).join(', '), total: o.total, status: o.status, createdAt: fmt(o.createdAt) }));
  const buf = await buildXlsx('Shop Orders', [
    { header: 'Order', key: 'id', width: 12 }, { header: 'Customer', key: 'customer', width: 22 },
    { header: 'Items', key: 'items', width: 44 }, { header: 'Total (BD)', key: 'total', width: 12 },
    { header: 'Status', key: 'status', width: 12 }, { header: 'Placed', key: 'createdAt', width: 14 }
  ], rows);
  logAction(req, 'export:orders', from + ' to ' + to);
  sendXlsx(res, 'orders_' + from + '_to_' + to + '.xlsx', buf);
}

async function report(req, res) {
  const { from, to } = resolveRange(req.query);
  const invRows = invoiceModel.invoices.filter(i => inRange(i.issuedAt, from, to));
  const expRows = expenseModel.expenses.filter(e => inRange(e.date, from, to));
  const caseRows = caseModel.cases.filter(c => inRange(c.createdAt, from, to));
  const aptRows = appointmentModel.appointments.filter(a => inRange(a.createdAt, from, to));
  const revenue = invRows.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = invRows.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expRows.reduce((s, e) => s + e.amount, 0);

  const buf = await buildReportDocx({
    title: 'Ceram Dental — Business Report',
    subtitle: from + ' to ' + to,
    sections: [
      {
        heading: 'Summary',
        table: {
          header: ['Metric', 'Value'],
          rows: [
            ['Revenue collected (BD)', revenue.toFixed(3)],
            ['Outstanding (BD)', outstanding.toFixed(3)],
            ['Expenses (BD)', totalExpenses.toFixed(3)],
            ['Net (BD)', (revenue - totalExpenses).toFixed(3)],
            ['Cases opened', String(caseRows.length)],
            ['Appointment requests', String(aptRows.length)]
          ]
        }
      },
      {
        heading: 'Invoices',
        table: {
          header: ['Invoice', 'Case', 'Clinic', 'Amount', 'Status'],
          rows: invRows.map(i => [i.id, i.caseId, i.clinic, i.amount.toFixed(3), i.status])
        }
      },
      {
        heading: 'Expenses',
        table: {
          header: ['Expense', 'Category', 'Description', 'Amount'],
          rows: expRows.map(e => [e.id, e.category, e.description, e.amount.toFixed(3)])
        }
      }
    ]
  });
  logAction(req, 'export:report', from + ' to ' + to);
  sendDocx(res, 'ceram-dental-report_' + from + '_to_' + to + '.docx', buf);
}

function fmt(d) { return new Date(d).toISOString().slice(0, 10); }

module.exports = {
  invoices: asyncHandler(invoices),
  expenses: asyncHandler(expenses),
  appointments: asyncHandler(appointments),
  cases: asyncHandler(cases),
  orders: asyncHandler(orders),
  report: asyncHandler(report)
};
