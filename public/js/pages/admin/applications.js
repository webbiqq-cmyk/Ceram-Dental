import { DATA } from '../../state.js';
import { esc, fmtDate } from '../../utils/format.js';

export function adminApplications() {
  if (!DATA.applications.length) return '<div class="empty-note">No applications yet.</div>';
  const rows = DATA.applications.map(a =>
    '<div class="list-row"><div><div class="t">' + esc(a.name) + ' — ' + esc(a.jobTitle) + '</div><div class="s">' + esc(a.email) + (a.note ? ' · ' + esc(a.note) : '') + '</div></div><div class="s">' + fmtDate(a.createdAt) + '</div></div>'
  ).join('');
  return '<div class="card reveal"><div class="list-plain">' + rows + '</div></div>';
}
