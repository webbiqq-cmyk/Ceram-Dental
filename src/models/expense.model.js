const records = require('../db/records');
const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');

const expenses = [
  { id: nextId('expense', 'EXP-'), category: 'Materials', description: 'Zirconia & ceramic blocks — weekly restock', amount: 420, date: daysAgo(6) },
  { id: nextId('expense', 'EXP-'), category: 'Equipment', description: 'CAD-CAM mill maintenance', amount: 95, date: daysAgo(11) },
  { id: nextId('expense', 'EXP-'), category: 'Payroll', description: 'Lab staff salaries (this week)', amount: 980, date: daysAgo(3) },
  { id: nextId('expense', 'EXP-'), category: 'Facilities', description: 'Unit rent — New Zinj', amount: 650, date: daysAgo(14) },
  { id: nextId('expense', 'EXP-'), category: 'Facilities', description: 'Utilities & internet', amount: 85, date: daysAgo(9) }
];

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
