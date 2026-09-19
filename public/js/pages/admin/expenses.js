import { DATA, api, loadState } from '../../state.js';
import { esc, money, fmtDate } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

export function adminExpenses() {
  const groups = {};
  DATA.expenses.forEach(e => {
    const key = e.category || 'Other';
    groups[key] = groups[key] || [];
    groups[key].push(e);
  });
  const total = DATA.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const groupHtml = Object.entries(groups).sort((a, b) => b[1].reduce((s, e) => s + e.amount, 0) - a[1].reduce((s, e) => s + e.amount, 0)).map(([cat, list]) => {
    const subtotal = list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const rows = list.map(e => '<div class="expense-row"><div><b>' + esc(e.description || cat) + '</b><span>' + fmtDate(e.date) + '</span></div><strong>' + money(e.amount) + '</strong></div>').join('');
    return '<details class="expense-group" open><summary><span>' + esc(cat) + '</span><b>' + money(subtotal) + '</b></summary>' + rows + '</details>';
  }).join('');
  return '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:12px;">Log an expense</span>' +
    '<form id="expenseForm" class="expense-form">' +
      '<select id="ex-category"><option>Materials</option><option>Equipment</option><option>Payroll</option><option>Facilities</option><option>Marketing</option><option>Other</option></select>' +
      '<input id="ex-desc" placeholder="Description" required>' +
      '<input id="ex-amount" type="number" min="0" step="0.001" placeholder="BD amount" required>' +
      '<button class="btn btn-primary" type="submit">Add</button>' +
    '</form></div>' +
    '<div class="stat-strip reveal" style="margin:0 0 20px;"><div class="chipstat"><b>' + money(total) + '</b><span>Total expenses</span></div><div class="chipstat"><b>' + Object.keys(groups).length + '</b><span>Categories</span></div><div class="chipstat"><b>' + DATA.expenses.length + '</b><span>Entries</span></div></div>' +
    '<div class="card reveal"><span class="eyebrow" style="margin-bottom:12px;">Expenses by category</span>' + (groupHtml || '<p class="empty-note">No expenses logged yet.</p>') + '</div>';
}

export function attachExpensesHandlers() {
  const ef = document.getElementById('expenseForm');
  if (ef) ef.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/expenses', { method: 'POST', body: JSON.stringify({ category: document.getElementById('ex-category').value, description: document.getElementById('ex-desc').value, amount: document.getElementById('ex-amount').value }) });
      await loadState(); renderCurrent(); toast('Expense logged');
    } catch (err) { toast(err.message); }
  });
}
