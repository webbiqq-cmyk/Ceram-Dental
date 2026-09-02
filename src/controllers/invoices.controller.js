const { ok, bad } = require('../utils/respond');
const invoiceModel = require('../models/invoice.model');

function pay(req, res) {
  const inv = invoiceModel.payInvoice(req.params.id);
  if (!inv) return bad(res, 'Unknown invoice.');
  ok(res, { invoice: inv });
}

module.exports = { pay };
