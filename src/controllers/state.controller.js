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

// One consolidated read — the client caches this and re-fetches after every
// mutation, instead of wiring up a GET per resource.
function getState(req, res) {
  res.json({
    cases: caseModel.cases,
    invoices: invoiceModel.invoices,
    expenses: expenseModel.expenses,
    products: productModel.products,
    jobs: jobModel.jobs,
    applications: applicationModel.applications,
    messages: messageModel.messages,
    orders: orderModel.orders,
    team: teamModel.team,
    appointments: appointmentModel.appointments,
    enquiries: enquiryModel.enquiries,
    settings: settingsModel.settings,
    summary: summaryService.summary()
  });
}

module.exports = { getState };
