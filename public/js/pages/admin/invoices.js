import { DATA, api, loadState } from '../../state.js';
import { money, fmtDate } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

export function adminInvoices() {
  const rows = DATA.invoices.map(inv =>
    '<tr><td class="cid-cell">' + inv.id + '</td><td>' + inv.caseId + '</td><td>' + inv.clinic + '</td><td>' + money(inv.amount) + '</td>' +
      '<td><span class="pill st-' + inv.status + '"><span class="dot"></span>' + inv.status + '</span></td>' +
      '<td>' + (inv.status !== 'paid' ? '<button class="btn btn-primary btn-sm" data-pay-invoice="' + inv.id + '">Mark paid</button>' : '<span style="color:var(--ink-soft); font-size:12.5px;">Paid ' + fmtDate(inv.paidAt) + '</span>') + '</td></tr>'
  ).join('');
  return '<div class="table-wrap reveal"><table class="cases-table"><thead><tr><th>Invoice</th><th>Case</th><th>Clinic</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

export function attachInvoicesHandlers() {
  document.querySelectorAll('[data-pay-invoice]').forEach(b => b.addEventListener('click', async () => {
    try {
      await api('/api/invoices/' + b.dataset.payInvoice + '/pay', { method: 'POST' });
      await loadState(); renderCurrent(); toast('Invoice marked paid');
    } catch (e) { toast(e.message); }
  }));
}
