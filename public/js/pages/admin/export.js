// Manual data export — Excel per data type, plus one Word summary report —
// filterable by date range (defaults to the current month, i.e. "monthly").
// These are plain downloads: the browser's normal cookie-based auth on a
// same-origin navigation is enough, no fetch/blob plumbing needed.
function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() { return new Date().toISOString().slice(0, 10); }

const EXPORTS = [
  ['invoices.xlsx', 'Invoices', 'Excel'],
  ['expenses.xlsx', 'Expenses', 'Excel'],
  ['appointments.xlsx', 'Appointments', 'Excel'],
  ['cases.xlsx', 'Cases', 'Excel'],
  ['orders.xlsx', 'Shop Orders', 'Excel'],
  ['report.docx', 'Business Report', 'Word']
];

export function adminExport() {
  return (
    '<div class="card reveal" style="margin-bottom:20px;">' +
      '<span class="eyebrow" style="margin-bottom:14px;">Date range</span>' +
      '<div class="form-grid">' +
        '<div class="field"><label>From</label><input type="date" id="exp-from" value="' + firstOfMonth() + '"></div>' +
        '<div class="field"><label>To</label><input type="date" id="exp-to" value="' + today() + '"></div>' +
      '</div>' +
      '<p style="color:var(--ink-soft); font-size:12.5px; margin-top:10px;">Defaults to the current month — pick any range for a custom export.</p>' +
    '</div>' +
    '<div class="card reveal"><span class="eyebrow" style="margin-bottom:14px;">Download</span>' +
      '<div class="list-plain">' + EXPORTS.map(([file, label, fmt]) =>
        '<div class="list-row"><div><div class="t">' + label + '</div><div class="s">' + fmt + '</div></div>' +
          '<button class="btn btn-ghost btn-sm" data-export-file="' + file + '">Download</button></div>'
      ).join('') + '</div>' +
    '</div>'
  );
}

export function attachExportHandlers() {
  document.querySelectorAll('[data-export-file]').forEach(b => b.addEventListener('click', () => {
    const from = document.getElementById('exp-from').value;
    const to = document.getElementById('exp-to').value;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    window.location.href = '/api/admin/export/' + b.dataset.exportFile + '?' + params.toString();
  }));
}
