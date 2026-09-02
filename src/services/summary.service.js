// Dashboard aggregation — reads across models to build the admin overview
// numbers and the revenue sparkline. Nothing here owns data; it only reports.
const { daysAgo } = require('../utils/dates');
const caseModel = require('../models/case.model');
const invoiceModel = require('../models/invoice.model');
const expenseModel = require('../models/expense.model');
const orderModel = require('../models/order.model');
const applicationModel = require('../models/application.model');
const messageModel = require('../models/message.model');
const appointmentModel = require('../models/appointment.model');
const enquiryModel = require('../models/enquiry.model');

function revenueTrend(days) {
  days = days || 7;
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    buckets.push({ key: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: 'short' }), total: 0 });
  }
  invoiceModel.invoices.filter(inv => inv.status === 'paid' && inv.paidAt).forEach(inv => {
    const key = new Date(inv.paidAt).toDateString();
    const b = buckets.find(x => x.key === key);
    if (b) b.total += inv.amount;
  });
  return buckets.map(b => ({ label: b.label, total: b.total }));
}

function summary() {
  const invoices = invoiceModel.invoices;
  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === 'overdue').length;
  const totalExpenses = expenseModel.expenses.reduce((s, e) => s + e.amount, 0);
  const activeCases = caseModel.cases.filter(c => c.stage !== 'ready').length;
  const readyCases = caseModel.cases.filter(c => c.stage === 'ready').length;
  const shopRevenue = orderModel.orders.reduce((s, o) => s + o.total, 0);
  const newAppointments = appointmentModel.appointments.filter(a => a.status === 'new').length;
  const newEnquiries = enquiryModel.enquiries.filter(e => e.stage === 'new').length;
  return {
    revenue, outstanding, overdue, totalExpenses,
    net: Math.round((revenue + shopRevenue - totalExpenses) * 100) / 100,
    activeCases, readyCases, shopRevenue,
    openApplications: applicationModel.applications.length,
    newMessages: messageModel.messages.length,
    newAppointments, totalAppointments: appointmentModel.appointments.length,
    newEnquiries, totalEnquiries: enquiryModel.enquiries.length,
    trend: revenueTrend(7)
  };
}

module.exports = { summary, revenueTrend };
