import { DATA, api, loadState } from '../../state.js';
import { esc, fmtDate, svcLabel } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

export function adminAppointments() {
  if (!DATA.appointments.length) return '<div class="empty-note">No appointment requests yet.</div>';
  const rows = DATA.appointments.map(a => {
    const actions = a.status === 'new'
      ? '<button class="btn btn-primary btn-sm" data-appt-status="confirmed" data-appt-id="' + a.id + '">Confirm</button> <button class="btn btn-ghost btn-sm" data-appt-status="contacted" data-appt-id="' + a.id + '">Mark contacted</button>'
      : '<span style="color:var(--ink-soft); font-size:12.5px;">Updated</span>';
    return '<tr><td class="cid-cell">' + a.id + '</td><td>' + esc(a.name) + '<br><span style="color:var(--ink-soft); font-size:12px;">' + esc(a.phone) + '</span></td>' +
      '<td>' + (a.service ? svcLabel(a.service) : '—') + '</td>' +
      '<td>' + (a.preferredDate ? fmtDate(a.preferredDate) : '—') + '</td>' +
      '<td><span class="pill st-' + a.status + '"><span class="dot"></span>' + a.status + '</span></td>' +
      '<td>' + actions + '</td></tr>';
  }).join('');
  return '<div class="table-wrap reveal"><table class="cases-table"><thead><tr><th>Request</th><th>Contact</th><th>Interested in</th><th>Preferred date</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

export function attachAppointmentsHandlers() {
  document.querySelectorAll('[data-appt-status]').forEach(b => b.addEventListener('click', async () => {
    try {
      await api('/api/appointments/' + b.dataset.apptId + '/status', { method: 'POST', body: JSON.stringify({ status: b.dataset.apptStatus }) });
      await loadState(); renderCurrent(); toast('Appointment updated');
    } catch (e) { toast(e.message); }
  }));
}
