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
          '<div class="field full" style="display:flex; align-items:center; gap:8px;">' +
            '<input type="checkbox" id="ag-remember" style="width:auto;"><label for="ag-remember" style="margin:0; font-weight:500;">Remember this device for 30 days</label>' +
          '</div>' +
          '<div class="field full"><button class="btn btn-primary btn-block" type="submit">Sign in</button></div>' +
          (role === 'dentist' ? '<div class="field full"><button class="link-btn" type="button" id="showDentistSignup">New dentist or clinic? Create an account</button></div>' : '') +
        '</form>' +
        (role === 'dentist' ? '<form id="dentistSignupForm" class="form-grid" hidden><div class="field full"><label>Full name</label><input id="su-name" required></div><div class="field"><label>Username</label><input id="su-username" required></div><div class="field"><label>Email</label><input id="su-email" type="email" required></div><div class="field"><label>Phone</label><input id="su-phone" type="tel" required></div><div class="field"><label>Password</label><input id="su-password" type="password" minlength="10" required></div><div class="field"><label>Account type</label><select id="su-type"><option value="clinic">I am an in-house clinic doctor</option><option value="individual">I am an outside / individual user</option></select></div><div class="field full"><label>Clinic or company (if applicable)</label><input id="su-company" placeholder="Clinic, company, or Individual use"></div><div class="field full"><button class="btn btn-primary btn-block" type="submit">Create dentist account</button></div></form>' : '') +
      '</div>' +
    '</div></div>'
  );
}

export function attachAuthGateHandlers() {
  const form = document.getElementById('authGateForm');
  if (!form) return;
  const role = form.dataset.role;
  const signup = document.getElementById('dentistSignupForm');
  document.getElementById('showDentistSignup')?.addEventListener('click', () => { form.hidden = true; signup.hidden = false; signup.querySelector('input').focus(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('ag-username').value;
    const password = document.getElementById('ag-password').value;
    const remember = document.getElementById('ag-remember').checked;
    try {
      await api('/api/auth/' + role + '/login', { method: 'POST', body: JSON.stringify({ username, password, remember }) });
      await loadState();
      renderCurrent();
      if (remember) toast('Signed in — this device will stay signed in for 30 days.');
    } catch (err) { toast(err.message); }
  });
  signup?.addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/auth/dentist/register', { method:'POST', body:JSON.stringify({name:document.getElementById('su-name').value,username:document.getElementById('su-username').value,email:document.getElementById('su-email').value,phone:document.getElementById('su-phone').value,password:document.getElementById('su-password').value,accountType:document.getElementById('su-type').value,company:document.getElementById('su-company').value}) }); await loadState(); renderCurrent(); toast('Dentist account created.'); } catch(err) { toast(err.message); } });
}

export async function logout(role) {
  try { await api('/api/auth/' + role + '/logout', { method: 'POST' }); } catch (e) { /* clearing client state regardless */ }
  await loadState();
  renderCurrent();
}
