// Read-only directory of every dentist account on the portal — in-house
// Ceram dentists and external/referring clinics who self-registered (see
// components/dentistSignup.js) or were added from Accounts & Access.
// Account management itself (create/reset password/delete) stays in one
// place, Accounts & Access, so this page only links out to it rather than
// duplicating those actions.
import { DATA } from '../../state.js';
import { esc, fmtDate } from '../../utils/format.js';
import { emptyState } from '../../components/emptyState.js';
import { icon } from '../../components/icons.js';

function caseCounts(userId) {
  const rows = DATA.orders.filter(o => o.dentist_user_id === userId);
  const active = rows.filter(o => !['completed', 'delivered', 'rejected_by_reception'].includes(o.status)).length;
  return { total: rows.length, active };
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

  const rows = [...dentists].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(d => {
    const isExternal = d.accountType === 'clinic';
    const deleted = d.active === false;
    const { total, active: activeCases } = caseCounts(d.id);
    const hay = [d.name, d.username, d.email, d.phone, d.company].map(v => String(v || '').toLowerCase()).join(' ');
    return '<div class="card reveal dentist-card' + (deleted ? ' is-hidden' : '') + '" data-dentist-search="' + esc(hay) + '">' +
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
      '<div class="dentist-card-foot"><time>Registered ' + fmtDate(d.createdAt) + '</time><button class="btn btn-ghost btn-sm" type="button" data-admin-tab="accounts">Manage account →</button></div>' +
    '</div>';
  }).join('');

  return strip + toolbar + '<div class="dentist-list">' + rows + '</div><p class="empty-note" id="dentistNoMatch" hidden>No dentists match that search.</p>';
}

export function attachDentistsHandlers() {
  document.getElementById('dentistSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase(); let shown = 0;
    document.querySelectorAll('[data-dentist-search]').forEach(card => { card.hidden = !card.dataset.dentistSearch.includes(q); if (!card.hidden) shown++; });
    const noMatch = document.getElementById('dentistNoMatch');
    if (noMatch) noMatch.hidden = shown > 0;
  });
}
