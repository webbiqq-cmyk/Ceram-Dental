const { ok, bad } = require('../utils/respond');
const expenseModel = require('../models/expense.model');
const { logAction } = require('../utils/audit');

async function create(req, res) {
  const { category, description, amount } = req.body || {};
  if (!category || !amount) return bad(res, 'Category and amount are required.');
  const exp = await expenseModel.addExpense({ category, description, amount: Number(amount) });
  await logAction(req, 'expense:add', exp.category + ' — ' + exp.amount);
  ok(res, { expense: exp });
}

module.exports = { create };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
