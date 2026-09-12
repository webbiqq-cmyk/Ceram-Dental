// Central access control, as asked: every login account for every portal
// (admin/dentist/lab) is created, deactivated, password-reset or deleted
// from right here — nowhere else in the app can mint a new account.
import { DATA, api, loadState } from '../../state.js';
import { esc, fmtDateTime } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';

const ROLE_LABEL = { admin: 'Admin', dentist: 'Dentist Portal', lab: 'Lab Studio', receptionist:'Reception', designer:'Designer', technician:'Technician', qc:'Quality Control' };

function roleOptions() {
  return Object.keys(ROLE_LABEL).map(r => '<option value="' + r + '">' + ROLE_LABEL[r] + '</option>').join('');
}

export function adminAccounts() {
  const sessionsByUser = {};
  DATA.activeSessions.forEach(s => { (sessionsByUser[s.userId] = sessionsByUser[s.userId] || []).push(s); });

  const addForm = '<div class="card reveal" style="margin-bottom:20px;"><span class="eyebrow" style="margin-bottom:14px;">Create an account</span>' +
    '<form id="userAddForm" class="form-grid">' +
      '<div class="field"><label>Full name</label><input id="ua-name" required></div>' +
      '<div class="field"><label>Portal / role</label><select id="ua-role">' + roleOptions() + '</select></div>' +
      '<div class="field"><label>Username</label><input id="ua-username" required></div>' +
      '<div class="field"><label>Password</label><input id="ua-password" type="password" minlength="10" required placeholder="At least 10 characters"></div>' +
      '<div class="field full"><button class="btn btn-primary" type="submit">Create account</button></div>' +
    '</form></div>';

  const card = (u, { deleted } = {}) => {
    const sessions = sessionsByUser[u.id] || [];
    const sessionInfo = sessions.length
      ? sessions.map(s => '<span class="pill st-confirmed" style="margin:2px 4px 2px 0;">' + (s.remembered ? 'Remembered device' : 'Session') + ' · <button class="link-btn" data-revoke-session="' + s.jti + '" style="all:unset; cursor:pointer; text-decoration:underline;">sign out</button></span>').join('')
      : '<span style="color:var(--ink-soft); font-size:12px;">Not currently signed in</span>';
    return '<div class="card reveal" style="margin-bottom:12px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">' +
        '<div>' +
          '<div style="font-weight:700;">' + esc(u.name) + (deleted ? ' <span class="pill st-overdue">Deleted</span>' : '') + '</div>' +
          '<div style="color:var(--ink-soft); font-size:12.5px; margin-top:2px;">' + esc(u.username) + ' · ' + ROLE_LABEL[u.role] + ' · added ' + fmtDateTime(u.createdAt) + '</div>' +
          (deleted ? '' : '<div style="margin-top:8px;">' + sessionInfo + '</div>') +
        '</div>' +
        '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
          (deleted
            ? '<button class="btn btn-ghost btn-sm" data-toggle-active="' + u.id + '" data-next="true">Restore account</button>'
            : '<button class="btn btn-ghost btn-sm" data-reset-password="' + u.id + '">Reset password</button>' +
              '<button class="btn btn-danger-ghost btn-sm" data-delete-user="' + u.id + '">Delete</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  };

  // "Delete" keeps the account's history intact underneath (case/job-order
  // records still point to a real user, not a dangling id) but it needs to
  // actually disappear from the working list — otherwise every delete just
  // looks like it silently failed, since the row stayed right there.
  const active = DATA.users.filter(u => u.active !== false);
  const deleted = DATA.users.filter(u => u.active === false);
  const deletedSection = deleted.length
    ? '<details style="margin-top:24px;"><summary class="eyebrow" style="cursor:pointer;">Deleted accounts (' + deleted.length + ')</summary><p class="lede" style="margin:10px 0 14px;">Kept, not erased — case and order history still refers to a real account. Restore one if it was deleted by mistake.</p>' + deleted.map(u => card(u, { deleted: true })).join('') + '</details>'
    : '';

  return addForm + '<span class="eyebrow" style="margin-bottom:10px;">All accounts</span>' + active.map(u => card(u)).join('') + deletedSection;
}

export function attachAccountsHandlers() {
  const addForm = document.getElementById('userAddForm');
  if (addForm) addForm.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/admin/users', { method: 'POST', body: JSON.stringify({
        name: document.getElementById('ua-name').value,
        role: document.getElementById('ua-role').value,
        username: document.getElementById('ua-username').value,
        password: document.getElementById('ua-password').value
      }) });
      await loadState(); renderCurrent(); toast('Account created');
    } catch (err) { toast(err.message); }
  });

  // Only "Restore account" reaches this now — the old separate
  // Deactivate/Reactivate toggle did exactly the same thing as Delete
  // always did (both just flip active:false), so it's folded into one
  // clear action below instead of two buttons with identical effects.
  document.querySelectorAll('[data-toggle-active]').forEach(b => b.addEventListener('click', async () => {
    try {
      await api('/api/admin/users/' + b.dataset.toggleActive, { method: 'POST', body: JSON.stringify({ active: b.dataset.next === 'true' }) });
      await loadState(); renderCurrent(); toast('Account restored');
    } catch (err) { toast(err.message); }
  }));

  document.querySelectorAll('[data-reset-password]').forEach(b => b.addEventListener('click', async () => {
    const newPassword = window.prompt('New password (at least 10 characters):');
    if (!newPassword) return;
    try {
      await api('/api/admin/users/' + b.dataset.resetPassword + '/reset-password', { method: 'POST', body: JSON.stringify({ newPassword }) });
      toast('Password reset');
    } catch (err) { toast(err.message); }
  }));

  document.querySelectorAll('[data-delete-user]').forEach(b => b.addEventListener('click', async () => {
    if (!window.confirm('Delete this account? They lose access immediately. Case and order history stays intact, and this can be undone from "Deleted accounts" below if needed.')) return;
    try {
      await api('/api/admin/users/' + b.dataset.deleteUser + '/delete', { method: 'POST' });
      await loadState(); renderCurrent(); toast('Account deleted');
    } catch (err) { toast(err.message); }
  }));

  document.querySelectorAll('[data-revoke-session]').forEach(b => b.addEventListener('click', async () => {
    try {
      await api('/api/admin/sessions/' + b.dataset.revokeSession + '/revoke', { method: 'POST' });
      await loadState(); renderCurrent(); toast('Device signed out');
    } catch (err) { toast(err.message); }
  }));
}
