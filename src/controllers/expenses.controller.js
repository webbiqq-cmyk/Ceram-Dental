const { ok, bad } = require('../utils/respond');
const expenseModel = require('../models/expense.model');
const { logAction } = require('../utils/audit');

function create(req, res) {
  const { category, description, amount } = req.body || {};
  if (!category || !amount) return bad(res, 'Category and amount are required.');
  const exp = expenseModel.addExpense({ category, description, amount: Number(amount) });
  logAction(req, 'expense:add', exp.category + ' — ' + exp.amount);
  ok(res, { expense: exp });
}

module.exports = { create };
