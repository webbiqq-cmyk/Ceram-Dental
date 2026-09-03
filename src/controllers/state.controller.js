const caseModel = require('../models/case.model');
const invoiceModel = require('../models/invoice.model');
const expenseModel = require('../models/expense.model');
const productModel = require('../models/product.model');
const jobModel = require('../models/job.model');
const applicationModel = require('../models/application.model');
const messageModel = require('../models/message.model');
const orderModel = require('../models/order.model');
const teamModel = require('../models/team.model');
const appointmentModel = require('../models/appointment.model');
const enquiryModel = require('../models/enquiry.model');
const settingsModel = require('../models/settings.model');
const summaryService = require('../services/summary.service');
const { readSession } = require('../middleware/auth');

// One consolidated read the client re-fetches after every mutation — but
// unlike before, what comes back now depends on who's asking. Every caller
// (including a signed-out visitor on the public site) gets the safe public
// baseline; each portal's private data is included only when that portal's
// own session cookie is valid, checked independently per role so a dentist
// session can never pull admin/lab data and vice versa.
function getState(req, res) {
  const isAdmin = !!readSession(req, 'admin');
  const isDentist = !!readSession(req, 'dentist');
  const isLab = !!readSession(req, 'lab');

  const payload = {
    // Public baseline — what the marketing site (home/about/services/shop/
    // contact/careers) needs, safe for any anonymous visitor.
    team: teamModel.team,
    jobs: jobModel.jobs,
    products: isAdmin ? productModel.products : productModel.products.filter(p => p.active !== false),
    settings: settingsModel.settings,
    auth: { admin: isAdmin, dentist: isDentist, lab: isLab },
    // Private — empty unless that portal's own session is valid.
    cases: [],
    invoices: [],
    expenses: [],
    applications: [],
    messages: [],
    orders: [],
    appointments: [],
    enquiries: [],
    summary: {}
  };

  const needsCases = isAdmin || isDentist || isLab;
  if (needsCases) payload.cases = caseModel.cases;
  if (isAdmin || isDentist) payload.invoices = invoiceModel.invoices;

  if (isAdmin) {
    payload.expenses = expenseModel.expenses;
    payload.applications = applicationModel.applications;
    payload.messages = messageModel.messages;
    payload.orders = orderModel.orders;
    payload.appointments = appointmentModel.appointments;
    payload.enquiries = enquiryModel.enquiries;
    payload.summary = summaryService.summary();
  }

  res.json(payload);
}

module.exports = { getState };
