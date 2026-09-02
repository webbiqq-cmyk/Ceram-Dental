import { DATA, api, loadState } from '../../state.js';
import { esc } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

export function adminTeam() {
  const rows = DATA.team.map(m => {
    const av = m.photo ? '<div class="av"><img src="' + esc(m.photo) + '" alt="" loading="lazy"></div>' : '<div class="av">' + esc(m.initials) + '</div>';
    return '<div class="team-mini">' + av + '<div><div class="t" style="font-weight:600;">' + esc(m.name) + (m.years ? ' <span style="color:var(--ink-soft); font-weight:400;">· ' + m.years + '+ yrs</span>' : '') + '</div><div class="s" style="color:var(--ink-soft); font-size:12.5px;">' + esc(m.role) + '</div></div></div>';
  }).join('');
  return '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:12px;">Add a team member</span>' +
    '<form id="teamForm" class="team-form">' +
      '<input id="tm-name" placeholder="Full name" required>' +
      '<input id="tm-role" placeholder="Role / specialty" required>' +
      '<button class="btn btn-primary" type="submit">Add</button>' +
    '</form></div>' +
    '<div class="card reveal"><span class="eyebrow" style="margin-bottom:6px;">Doctors &amp; staff</span>' + rows + '</div>';
}

export function attachTeamHandlers() {
  const tf = document.getElementById('teamForm');
  if (tf) tf.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/team', { method: 'POST', body: JSON.stringify({ name: document.getElementById('tm-name').value, role: document.getElementById('tm-role').value }) });
      await loadState(); renderCurrent(); toast('Team member added');
    } catch (err) { toast(err.message); }
  });
}
