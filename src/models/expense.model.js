const records = require('../db/records');
const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');

// Starts empty — expenses are entered by admin.
const expenses = [];

async function addExpense({ category, description, amount }) {
  category = String(category || '').trim().slice(0, 80);
  description = String(description || '').trim().slice(0, 500);
  const value = Number(amount);
  if (!category || !Number.isFinite(value) || value <= 0 || value > 100000000) return null;
  const exp = { id: nextId('expense', 'EXP-'), category, description, amount: Math.round(value * 1000) / 1000, date: new Date() };
  await records.insert('expenses', exp);
  return exp;
}

records.register('expenses', expenses);
async function list(options) { return records.list('expenses', options); }
module.exports = { list, expenses, addExpense };
