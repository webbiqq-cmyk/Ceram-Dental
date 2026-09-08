import { DATA, api, loadState } from '../../state.js';
import { esc } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

// Which member's editor is open. Module-level so it survives re-renders.
let editingId = null;

// Downscale a picked image to a small avatar before it ever leaves the
// browser — keeps team photos light enough to ride along in /api/state.
function downscaleImage(file, max = 400) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });
}

function avatar(m, big) {
  const cls = 'team-av' + (big ? ' team-av-lg' : '');
  return m.photo
    ? '<span class="' + cls + '"><img src="' + esc(m.photo) + '" alt="" loading="lazy"></span>'
    : '<span class="' + cls + ' team-av-fallback">' + esc(m.initials || '—') + '</span>';
}

function editor(m) {
  return '<form class="team-editor" data-team-form="' + esc(m.id) + '">' +
    '<div class="team-editor-photo">' + avatar(m, true) +
      '<div><label class="btn btn-ghost btn-sm">Change photo<input type="file" accept="image/*" data-team-photo="' + esc(m.id) + '" hidden></label>' +
      (m.photo ? '<button type="button" class="link-btn" data-team-photo-clear="' + esc(m.id) + '">Remove photo</button>' : '') +
      '<p class="team-hint">Any size — it is resized to a small avatar automatically.</p></div>' +
    '</div>' +
    '<div class="field-grid">' +
      '<div class="field"><label>Full name</label><input data-f="name" value="' + esc(m.name) + '" required></div>' +
      '<div class="field"><label>Name in Arabic <span>(optional)</span></label><input data-f="nameAr" dir="rtl" value="' + esc(m.nameAr || '') + '"></div>' +
      '<div class="field"><label>Role / specialty</label><input data-f="role" value="' + esc(m.role || '') + '"></div>' +
      '<div class="field"><label>Years of experience</label><input data-f="years" type="number" min="0" max="70" value="' + (m.years || 0) + '"></div>' +
      '<div class="field full"><label>Credentials <span>(one per line)</span></label><textarea data-f="credentials" rows="4">' + esc((m.credentials || []).join('\n')) + '</textarea></div>' +
    '</div>' +
    '<div class="team-editor-actions"><button type="submit" class="btn btn-primary btn-sm">Save changes</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-team-cancel>Cancel</button>' +
      '<button type="button" class="link-btn team-remove" data-team-remove="' + esc(m.id) + '">Remove from team</button></div>' +
  '</form>';
}

function row(m) {
  if (editingId === m.id) return '<div class="team-row is-editing">' + editor(m) + '</div>';
  const meta = [m.role, m.years ? m.years + '+ yrs' : '', (m.credentials || []).length ? (m.credentials.length + ' credential' + (m.credentials.length === 1 ? '' : 's')) : '']
    .filter(Boolean).join('  ·  ');
  return '<div class="team-row">' + avatar(m) +
    '<div class="team-row-main"><b>' + esc(m.name) + '</b><span>' + esc(meta || '—') + '</span></div>' +
    '<button type="button" class="btn btn-ghost btn-sm" data-team-edit="' + esc(m.id) + '">Edit</button></div>';
}

export function adminTeam() {
  return '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:12px;">Add a team member</span>' +
    '<form id="teamAddForm" class="team-add"><input id="tm-name" placeholder="Full name" required>' +
    '<input id="tm-role" placeholder="Role / specialty">' +
    '<button class="btn btn-primary" type="submit">Add</button></form>' +
    '<p class="team-hint" style="margin-top:8px;">Add the name and role now — open the member to fill in photo, Arabic name, experience and credentials.</p></div>' +
    '<div class="card reveal"><span class="eyebrow" style="margin-bottom:10px;">Doctors &amp; staff · ' + DATA.team.length + '</span>' +
    '<div class="team-list">' + (DATA.team.length ? DATA.team.map(row).join('') : '<p class="empty-note">No team members yet.</p>') + '</div></div>';
}

async function patch(id, fields, msg) {
  await api('/api/team/' + id, { method: 'PATCH', body: JSON.stringify(fields) });
  await loadState();
  renderCurrent();
  if (msg) toast(msg);
}

export function attachTeamHandlers() {
  const add = document.getElementById('teamAddForm');
  if (add) add.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const { member } = await api('/api/team', { method: 'POST', body: JSON.stringify({
        name: document.getElementById('tm-name').value, role: document.getElementById('tm-role').value
      }) });
      editingId = member.id;
      await loadState(); renderCurrent(); toast('Team member added — fill in the rest');
    } catch (err) { toast(err.message); }
  });

  document.querySelectorAll('[data-team-edit]').forEach(b => b.addEventListener('click', () => { editingId = b.dataset.teamEdit; renderCurrent(); }));
  document.querySelector('[data-team-cancel]')?.addEventListener('click', () => { editingId = null; renderCurrent(); });

  document.querySelector('[data-team-form]')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = {};
    form.querySelectorAll('[data-f]').forEach(el => {
      fields[el.dataset.f] = el.dataset.f === 'credentials'
        ? el.value.split('\n').map(s => s.trim()).filter(Boolean)
        : el.value;
    });
    try { editingId = null; await patch(form.dataset.teamForm, fields, 'Saved'); }
    catch (err) { toast(err.message); }
  });

  document.querySelector('[data-team-photo]')?.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await downscaleImage(file);
      await patch(e.target.dataset.teamPhoto, { photo: dataUrl }, 'Photo updated');
    } catch (err) { toast(err.message); }
  });
  document.querySelector('[data-team-photo-clear]')?.addEventListener('click', () =>
    patch(document.querySelector('[data-team-photo-clear]').dataset.teamPhotoClear, { photo: '' }, 'Photo removed').catch(err => toast(err.message)));

  document.querySelector('[data-team-remove]')?.addEventListener('click', async e => {
    const id = e.target.dataset.teamRemove;
    const m = DATA.team.find(x => x.id === id);
    if (!confirm('Remove ' + (m ? m.name : 'this member') + ' from the team?')) return;
    try {
      await api('/api/team/' + id, { method: 'DELETE' });
      editingId = null; await loadState(); renderCurrent(); toast('Removed');
    } catch (err) { toast(err.message); }
  });
}
