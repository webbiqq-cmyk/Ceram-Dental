import { DATA, api, loadState } from '../../state.js';
import { esc, money, fmtDate } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

export function adminExpenses() {
  const rows = DATA.expenses.map(e =>
    '<div class="list-row"><div><div class="t">' + esc(e.description) + '</div><div class="s">' + e.category + ' · ' + fmtDate(e.date) + '</div></div><div class="t">' + money(e.amount) + '</div></div>'
  ).join('');
  return '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:12px;">Log an expense</span>' +
    '<form id="expenseForm" class="expense-form">' +
      '<select id="ex-category"><option>Materials</option><option>Equipment</option><option>Payroll</option><option>Facilities</option><option>Marketing</option><option>Other</option></select>' +
      '<input id="ex-desc" placeholder="Description" required>' +
      '<input id="ex-amount" type="number" min="0" step="0.001" placeholder="BD amount" required>' +
      '<button class="btn btn-primary" type="submit">Add</button>' +
    '</form></div>' +
    '<div class="card reveal"><span class="eyebrow" style="margin-bottom:6px;">Recent expenses</span><div class="list-plain">' + rows + '</div></div>';
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
