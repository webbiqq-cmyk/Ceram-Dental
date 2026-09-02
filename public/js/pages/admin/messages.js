import { DATA } from '../../state.js';
import { esc, fmtDate } from '../../utils/format.js';

export function adminMessages() {
  if (!DATA.messages.length) return '<div class="empty-note">No messages yet.</div>';
  const rows = DATA.messages.map(m =>
    '<div class="list-row"><div><div class="t">' + esc(m.name) + '</div><div class="s">' + esc(m.email) + ' — ' + esc(m.message) + '</div></div><div class="s">' + fmtDate(m.createdAt) + '</div></div>'
  ).join('');
  return '<div class="card reveal"><div class="list-plain">' + rows + '</div></div>';
}
