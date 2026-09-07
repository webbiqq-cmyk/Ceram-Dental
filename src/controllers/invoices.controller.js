const { ok, bad } = require('../utils/respond');
const invoiceModel = require('../models/invoice.model');
const { logAction } = require('../utils/audit');

async function pay(req, res) {
  const inv = await invoiceModel.payInvoice(req.params.id);
  if (!inv) return bad(res, 'Unknown invoice.');
  await logAction(req, 'invoice:pay', inv.id);
  ok(res, { invoice: inv });
}

module.exports = { pay };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
