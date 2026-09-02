const { nextId } = require('../utils/ids');
const { daysAgo } = require('../utils/dates');

const expenses = [
  { id: nextId('expense', 'EXP-'), category: 'Materials', description: 'Zirconia & ceramic blocks — weekly restock', amount: 420, date: daysAgo(6) },
  { id: nextId('expense', 'EXP-'), category: 'Equipment', description: 'CAD-CAM mill maintenance', amount: 95, date: daysAgo(11) },
  { id: nextId('expense', 'EXP-'), category: 'Payroll', description: 'Lab staff salaries (this week)', amount: 980, date: daysAgo(3) },
  { id: nextId('expense', 'EXP-'), category: 'Facilities', description: 'Unit rent — New Zinj', amount: 650, date: daysAgo(14) },
  { id: nextId('expense', 'EXP-'), category: 'Facilities', description: 'Utilities & internet', amount: 85, date: daysAgo(9) }
];

function addExpense({ category, description, amount }) {
  const exp = { id: nextId('expense', 'EXP-'), category, description: description || '', amount: Number(amount), date: new Date() };
  expenses.unshift(exp);
  return exp;
}

module.exports = { expenses, addExpense };
