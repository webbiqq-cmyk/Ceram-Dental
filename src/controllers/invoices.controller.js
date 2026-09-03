const { ok, bad } = require('../utils/respond');
const invoiceModel = require('../models/invoice.model');
const { logAction } = require('../utils/audit');

function pay(req, res) {
  const inv = invoiceModel.payInvoice(req.params.id);
  if (!inv) return bad(res, 'Unknown invoice.');
  logAction(req, 'invoice:pay', inv.id);
  ok(res, { invoice: inv });
}

module.exports = { pay };
