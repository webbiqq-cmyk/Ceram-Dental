// Directory of every dentist account on the portal — in-house Ceram
// dentists and external/referring clinics who self-registered (see
// components/dentistSignup.js) or were added by an admin. Dentist Portal
// accounts live here exclusively now, not mixed into Accounts & Access
// (which is admin/lab-only) — so this page also owns their reset
// password / delete / restore actions, the same admin/users API
// Accounts & Access uses for everyone else.
import { DATA, api, loadState } from '../../state.js';
import { esc, fmtDate } from '../../utils/format.js';
import { toast } from '../../toast.js';
import { renderCurrent } from '../../router.js';
import { emptyState } from '../../components/emptyState.js';
import { icon } from '../../components/icons.js';
import { confirmAction } from '../../components/confirm.js';

function caseCounts(userId) {
  const rows = DATA.orders.filter(o => o.dentist_user_id === userId);
  const active = rows.filter(o => !['completed', 'delivered', 'rejected_by_reception'].includes(o.status)).length;
  return { total: rows.length, active };
}

function dentistCard(d, { deleted } = {}) {
  const isExternal = d.accountType === 'clinic';
  const { total, active: activeCases } = caseCounts(d.id);
  const hay = [d.name, d.username, d.email, d.phone, d.company].map(v => String(v || '').toLowerCase()).join(' ');
  return '<div class="card reveal dentist-card" data-dentist-search="' + esc(hay) + '">' +
    '<div class="dentist-card-top">' +
      '<div><b>' + esc(d.name) + '</b>' +
        '<span class="pill pill-neutral" style="margin-inline-start:8px;">' + (isExternal ? 'External / Referring' : 'In-house') + '</span>' +
        (deleted ? '<span class="pill pill-danger" style="margin-inline-start:6px;">Deleted</span>' : '') +
        (isExternal && d.company ? '<div class="dentist-company">' + esc(d.company) + '</div>' : '') +
      '</div>' +
      '<div class="dentist-cases"><b>' + total + '</b><span>case' + (total === 1 ? '' : 's') + (activeCases ? ' · ' + activeCases + ' active' : '') + '</span></div>' +
    '</div>' +
    '<div class="dentist-card-contact">' +
      (d.email ? '<span>' + icon('mail') + esc(d.email) + '</span>' : '') +
      (d.phone ? '<span>' + icon('phone') + esc(d.phone) + '</span>' : '') +
      '<span class="mono" style="color:var(--ink-soft);">@' + esc(d.username) + '</span>' +
    '</div>' +
    '<div class="dentist-card-foot"><time>Registered ' + fmtDate(d.createdAt) + '</time>' +
      '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
        (deleted
          ? '<button class="btn btn-ghost btn-sm" data-toggle-active="' + esc(d.id) + '" data-next="true">Restore account</button>'
          : '<button class="btn btn-ghost btn-sm" data-reset-password="' + esc(d.id) + '">Reset password</button>' +
            '<button class="btn btn-danger-ghost btn-sm" data-delete-user="' + esc(d.id) + '">Delete</button>') +
      '</div>' +
    '</div>' +
  '</div>';
}

export function adminDentists() {
  const dentists = DATA.users.filter(u => u.role === 'dentist');
  if (!dentists.length) {
    return emptyState({
      iconName: 'user', title: 'No dentists registered yet',
      text: 'Dentists who sign up from the website, or accounts you add yourself, will appear here.'
    });
  }

  const active = dentists.filter(d => d.active !== false);
  const deleted = dentists.filter(d => d.active === false);
  const externalCount = active.filter(d => d.accountType === 'clinic').length;
  const inHouse = active.length - externalCount;
  const now = new Date();
  const newThisMonth = active.filter(d => { const c = new Date(d.createdAt); return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear(); }).length;

  const strip = '<div class="stat-row reveal">' +
    '<div class="stat-card stat-card-v2"><div class="stat-card-icon">' + icon('users') + '</div><div class="stat-card-body"><div class="n">' + active.length + '</div><div class="l">Registered Dentists</div></div></div>' +
    '<div class="stat-card stat-card-v2"><div class="stat-card-icon">' + icon('inbox') + '</div><div class="stat-card-body"><div class="n">' + inHouse + '</div><div class="l">In-house</div></div></div>' +
    '<div class="stat-card stat-card-v2"><div class="stat-card-icon">' + icon('briefcase') + '</div><div class="stat-card-body"><div class="n">' + externalCount + '</div><div class="l">External / Referring</div></div></div>' +
    '<div class="stat-card stat-card-v2"><div class="stat-card-icon">' + icon('calendar') + '</div><div class="stat-card-body"><div class="n">' + newThisMonth + '</div><div class="l">New this month</div></div></div>' +
  '</div>';

  const toolbar = '<div class="workspace-toolbar reveal"><input type="search" id="dentistSearch" placeholder="Search by name, clinic, email or username…" autocomplete="off"></div>';

  const rows = [...active].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(d => dentistCard(d)).join('');
  const deletedSection = deleted.length
    ? '<details style="margin-top:24px;"><summary class="eyebrow" style="cursor:pointer;">Deleted dentists (' + deleted.length + ')</summary><p class="lede" style="margin:10px 0 14px;">Kept, not erased — case and order history still refers to a real account. Restore one if it was deleted by mistake.</p>' + deleted.map(d => dentistCard(d, { deleted: true })).join('') + '</details>'
    : '';

  return strip + toolbar + '<div class="dentist-list">' + rows + '</div><p class="empty-note" id="dentistNoMatch" hidden>No dentists match that search.</p>' + deletedSection;
}

export function attachDentistsHandlers() {
  document.getElementById('dentistSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase(); let shown = 0;
    document.querySelectorAll('[data-dentist-search]').forEach(card => { card.hidden = !card.dataset.dentistSearch.includes(q); if (!card.hidden) shown++; });
    const noMatch = document.getElementById('dentistNoMatch');
    if (noMatch) noMatch.hidden = shown > 0;
  });

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
    if (!await confirmAction({
      title: 'Delete this dentist account?',
      body: 'They lose access immediately. Their case and order history stays intact, and the account can be restored from "Deleted dentists" below.',
      confirmLabel: 'Delete account', tone: 'danger'
    })) return;
    try {
      await api('/api/admin/users/' + b.dataset.deleteUser + '/delete', { method: 'POST' });
      await loadState(); renderCurrent(); toast('Account deleted');
    } catch (err) { toast(err.message); }
  }));
}
