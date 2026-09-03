// Shared login form for the three private portals (Admin, Dentist, Lab).
// Each page's render function checks DATA.auth.<role> and, when false,
// renders this instead of the real page — so the private data itself is
// never even fetched into the page, let alone displayed, until the server
// has confirmed a valid session cookie for that role.
import { api, loadState } from '../state.js';
import { esc } from '../utils/format.js';
import { toast } from '../toast.js';
import { renderCurrent } from '../router.js';

export function renderLoginGate({ role, title, subtitle }) {
  return (
    '<div class="page"><div class="u">' +
      '<div class="login-gate reveal">' +
        '<span class="eyebrow-accent">Private</span>' +
        '<h1 style="font-size:1.7rem;">' + esc(title) + '</h1>' +
        '<p class="lede">' + esc(subtitle) + '</p>' +
        '<form id="authGateForm" class="form-grid" data-role="' + esc(role) + '">' +
          '<div class="field full"><label>Username</label><input id="ag-username" autocomplete="username" required></div>' +
          '<div class="field full"><label>Password</label><input id="ag-password" type="password" autocomplete="current-password" required></div>' +
          '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Sign in</button></div>' +
        '</form>' +
      '</div>' +
    '</div></div>'
  );
}

export function attachAuthGateHandlers() {
  const form = document.getElementById('authGateForm');
  if (!form) return;
  const role = form.dataset.role;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('ag-username').value;
    const password = document.getElementById('ag-password').value;
    try {
      await api('/api/auth/' + role + '/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      await loadState();
      renderCurrent();
    } catch (err) { toast(err.message); }
  });
}

export async function logout(role) {
  try { await api('/api/auth/' + role + '/logout', { method: 'POST' }); } catch (e) { /* clearing client state regardless */ }
  await loadState();
  renderCurrent();
}
