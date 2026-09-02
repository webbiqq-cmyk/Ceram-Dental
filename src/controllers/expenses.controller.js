const { ok, bad } = require('../utils/respond');
const expenseModel = require('../models/expense.model');

function create(req, res) {
  const { category, description, amount } = req.body || {};
  if (!category || !amount) return bad(res, 'Category and amount are required.');
  const exp = expenseModel.addExpense({ category, description, amount: Number(amount) });
  ok(res, { expense: exp });
}

module.exports = { create };
